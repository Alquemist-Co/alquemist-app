-- =============================================================
-- Migration 26: Review Fixes
-- Fixes multiple SQL functions and adds missing indexes
-- based on code review findings (CRIT-01 through CRIT-13 + minor)
-- =============================================================

-- =============================================================
-- CRIT-01: fn_transaction_kpis — add tenant scoping
-- KPIs must be filtered by company_id so tenants only see their own data.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_transaction_kpis(
  p_zone_id UUID DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL,
  p_item_id UUID DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'entries_count', COALESCE(SUM(CASE WHEN type IN ('receipt','transfer_in','transformation_in','return') THEN 1 END), 0),
    'entries_cost',  COALESCE(SUM(CASE WHEN type IN ('receipt','transfer_in','transformation_in','return') THEN cost_total END), 0),
    'exits_count',   COALESCE(SUM(CASE WHEN type IN ('consumption','application','transfer_out','transformation_out','waste') THEN 1 END), 0),
    'exits_cost',    COALESCE(SUM(CASE WHEN type IN ('consumption','application','transfer_out','transformation_out','waste') THEN cost_total END), 0),
    'adjust_count',  COALESCE(SUM(CASE WHEN type IN ('adjustment','reservation','release') THEN 1 END), 0),
    'adjust_cost',   COALESCE(SUM(CASE WHEN type IN ('adjustment','reservation','release') THEN cost_total END), 0)
  ) INTO v_result
  FROM inventory_transactions
  WHERE company_id = (SELECT get_my_company_id())
    AND (p_zone_id IS NULL OR zone_id = p_zone_id)
    AND (p_batch_id IS NULL OR batch_id = p_batch_id)
    AND (p_item_id IS NULL OR inventory_item_id = p_item_id)
    AND (p_from IS NULL OR timestamp >= p_from)
    AND (p_to IS NULL OR timestamp <= p_to);

  RETURN v_result;
END;
$$;

-- =============================================================
-- CRIT-02 + CRIT-09: fn_execute_activity
-- Fix column names in INSERT into inventory_transactions:
--   item_id → inventory_item_id, performed_by → user_id,
--   notes → reason, remove created_by, add unit_id/company_id/zone_id
-- Add inventory sufficiency check before decrementing.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_execute_activity(
  p_scheduled_activity_id UUID,
  p_activity_type_id UUID,
  p_zone_id UUID,
  p_batch_id UUID,
  p_phase_id UUID DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_duration_minutes INT DEFAULT NULL,
  p_measurement_data JSONB DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_checklist_results JSONB DEFAULT NULL,
  p_resources JSONB DEFAULT '[]',
  p_observations JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_id UUID;
  v_sa RECORD;
  v_resource RECORD;
  v_observation RECORD;
  v_transaction_id UUID;
  v_transactions_created INT := 0;
  v_phase_changed BOOLEAN := FALSE;
  v_template_triggers_phase UUID;
  v_combined_data JSONB;
  v_item RECORD;
BEGIN
  -- 1. Lock and verify scheduled_activity
  SELECT sa.*, at2.triggers_phase_change_id
  INTO v_sa
  FROM scheduled_activities sa
  LEFT JOIN activity_templates at2 ON at2.id = sa.template_id
  WHERE sa.id = p_scheduled_activity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scheduled activity not found';
  END IF;

  IF v_sa.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'La actividad ya fue % y no puede ejecutarse', v_sa.status;
  END IF;

  v_template_triggers_phase := v_sa.triggers_phase_change_id;

  -- 2. Combine measurement_data with checklist_results into one JSONB
  v_combined_data := COALESCE(p_measurement_data, '{}'::jsonb);
  IF p_checklist_results IS NOT NULL THEN
    v_combined_data := v_combined_data || jsonb_build_object('checklist_results', p_checklist_results);
  END IF;

  -- 3. Create activity record
  INSERT INTO activities (
    activity_type_id, template_id, scheduled_activity_id,
    batch_id, zone_id, performed_by, performed_at,
    duration_minutes, phase_id, crop_day,
    status, measurement_data, notes,
    created_by, updated_by
  ) VALUES (
    p_activity_type_id, v_sa.template_id, p_scheduled_activity_id,
    p_batch_id, p_zone_id, p_performed_by, now(),
    p_duration_minutes, p_phase_id, v_sa.crop_day,
    'completed', v_combined_data, p_notes,
    p_performed_by, p_performed_by
  )
  RETURNING id INTO v_activity_id;

  -- 4. Create activity_resources + inventory_transactions
  FOR v_resource IN
    SELECT * FROM jsonb_to_recordset(p_resources) AS x(
      product_id UUID,
      inventory_item_id UUID,
      quantity_planned NUMERIC,
      quantity_actual NUMERIC,
      unit_id UUID
    )
  LOOP
    -- Generate inventory_transaction (consumption)
    v_transaction_id := NULL;
    IF v_resource.inventory_item_id IS NOT NULL AND v_resource.quantity_actual > 0 THEN
      -- CRIT-09: Check inventory sufficiency before consuming
      SELECT * INTO v_item
      FROM inventory_items
      WHERE id = v_resource.inventory_item_id
      FOR UPDATE;

      IF v_item.quantity_available < v_resource.quantity_actual THEN
        RAISE EXCEPTION 'Insufficient inventory for item %', v_item.product_id;
      END IF;

      -- CRIT-02: Fixed column names to match inventory_transactions schema
      INSERT INTO inventory_transactions (
        company_id, type, inventory_item_id, quantity, unit_id,
        zone_id, user_id, reason
      ) VALUES (
        v_item.company_id,
        'consumption',
        v_resource.inventory_item_id,
        v_resource.quantity_actual,
        COALESCE(v_resource.unit_id, v_item.unit_id),
        v_item.zone_id,
        p_performed_by,
        'Consumo por actividad ' || v_activity_id::text
      )
      RETURNING id INTO v_transaction_id;

      -- Update inventory_item quantity
      UPDATE inventory_items
      SET quantity_available = quantity_available - v_resource.quantity_actual
      WHERE id = v_resource.inventory_item_id;

      v_transactions_created := v_transactions_created + 1;
    END IF;

    -- Calculate cost
    INSERT INTO activity_resources (
      activity_id, product_id, inventory_item_id,
      quantity_planned, quantity_actual, unit_id,
      cost_total, transaction_id
    ) VALUES (
      v_activity_id, v_resource.product_id, v_resource.inventory_item_id,
      v_resource.quantity_planned, v_resource.quantity_actual, v_resource.unit_id,
      (SELECT v_resource.quantity_actual * COALESCE(ii.cost_per_unit, 0)
       FROM inventory_items ii WHERE ii.id = v_resource.inventory_item_id),
      v_transaction_id
    );
  END LOOP;

  -- 5. Create activity_observations
  FOR v_observation IN
    SELECT * FROM jsonb_to_recordset(p_observations) AS x(
      type observation_type,
      agent_id UUID,
      plant_part plant_part,
      incidence_value NUMERIC,
      incidence_unit incidence_unit,
      severity observation_severity,
      severity_pct NUMERIC,
      sample_size INT,
      affected_plants INT,
      description TEXT,
      action_taken TEXT
    )
  LOOP
    INSERT INTO activity_observations (
      activity_id, type, agent_id, plant_part,
      incidence_value, incidence_unit, severity,
      severity_pct, sample_size, affected_plants,
      description, action_taken
    ) VALUES (
      v_activity_id, v_observation.type, v_observation.agent_id,
      v_observation.plant_part, v_observation.incidence_value,
      v_observation.incidence_unit,
      COALESCE(v_observation.severity, 'info'),
      v_observation.severity_pct, v_observation.sample_size,
      v_observation.affected_plants, v_observation.description,
      v_observation.action_taken
    );
  END LOOP;

  -- 6. Update scheduled_activity
  UPDATE scheduled_activities
  SET status = 'completed',
      completed_activity_id = v_activity_id,
      updated_by = p_performed_by
  WHERE id = p_scheduled_activity_id;

  -- 7. Optional phase transition
  IF v_template_triggers_phase IS NOT NULL THEN
    BEGIN
      PERFORM fn_transition_batch_phase(p_batch_id, p_performed_by);
      v_phase_changed := TRUE;
    EXCEPTION WHEN OTHERS THEN
      -- Phase transition failure shouldn't block activity completion
      RAISE WARNING 'Phase transition failed: %', SQLERRM;
    END;
  END IF;

  -- 8. Return result
  RETURN jsonb_build_object(
    'activity_id', v_activity_id,
    'transactions_created', v_transactions_created,
    'phase_changed', v_phase_changed
  );
END;
$$;

-- =============================================================
-- CRIT-05: fn_confirm_shipment_receipt
-- Fix: accepted_with_observations should NOT set v_all_accepted := false.
-- Only 'quarantine' should prevent full acceptance.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_confirm_shipment_receipt(
  p_shipment_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment     RECORD;
  v_item         RECORD;
  v_inv_item_id  UUID;
  v_tx_id        UUID;
  v_items_created INT := 0;
  v_all_accepted  BOOLEAN := true;
  v_any_accepted  BOOLEAN := false;
  v_final_status  shipment_status;
  v_lot_stat      lot_status;
  v_company_id    UUID;
BEGIN
  -- 1. Lock and verify shipment
  SELECT * INTO v_shipment
  FROM shipments
  WHERE id = p_shipment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found';
  END IF;

  IF v_shipment.status NOT IN ('received', 'inspecting') THEN
    RAISE EXCEPTION 'Shipment must be in received or inspecting status, got: %', v_shipment.status;
  END IF;

  v_company_id := v_shipment.company_id;

  -- 2. Verify all lines are inspected
  IF EXISTS (
    SELECT 1 FROM shipment_items
    WHERE shipment_id = p_shipment_id
      AND inspection_result IS NULL
  ) THEN
    RAISE EXCEPTION 'All shipment lines must be inspected before confirming';
  END IF;

  -- 3. Process each item
  FOR v_item IN
    SELECT * FROM shipment_items
    WHERE shipment_id = p_shipment_id
    ORDER BY sort_order
  LOOP
    IF v_item.inspection_result = 'rejected' THEN
      v_all_accepted := false;
      CONTINUE;
    END IF;

    v_any_accepted := true;

    -- Determine lot status
    IF v_item.inspection_result = 'quarantine' THEN
      v_lot_stat := 'quarantine';
    ELSE
      v_lot_stat := 'available';
    END IF;

    -- Create inventory_item
    INSERT INTO inventory_items (
      company_id, product_id, zone_id, quantity_available, unit_id,
      batch_number, supplier_lot_number, cost_per_unit, expiration_date,
      source_type, lot_status, shipment_item_id, created_by
    ) VALUES (
      v_company_id, v_item.product_id, v_item.destination_zone_id,
      COALESCE(v_item.received_quantity, 0), v_item.unit_id,
      COALESCE(v_item.supplier_lot_number, 'SHP-' || v_shipment.shipment_code || '-' || (v_items_created + 1)),
      v_item.supplier_lot_number, v_item.cost_per_unit, v_item.expiration_date,
      'purchase', v_lot_stat, v_item.id, p_user_id
    )
    RETURNING id INTO v_inv_item_id;

    -- Create receipt transaction
    INSERT INTO inventory_transactions (
      company_id, type, inventory_item_id, quantity, unit_id,
      zone_id, cost_per_unit, cost_total, user_id
    ) VALUES (
      v_company_id, 'receipt', v_inv_item_id,
      COALESCE(v_item.received_quantity, 0), v_item.unit_id,
      v_item.destination_zone_id, v_item.cost_per_unit,
      COALESCE(v_item.cost_per_unit, 0) * COALESCE(v_item.received_quantity, 0),
      p_user_id
    )
    RETURNING id INTO v_tx_id;

    -- Link back to shipment_item
    UPDATE shipment_items
    SET inventory_item_id = v_inv_item_id,
        transaction_id = v_tx_id
    WHERE id = v_item.id;

    v_items_created := v_items_created + 1;

    -- CRIT-05: Only quarantine prevents full acceptance
    -- accepted_with_observations is still considered accepted
    IF v_item.inspection_result = 'quarantine' THEN
      v_all_accepted := false;
    END IF;
  END LOOP;

  -- 4. Determine final status
  IF NOT v_any_accepted THEN
    v_final_status := 'rejected';
  ELSIF v_all_accepted THEN
    v_final_status := 'accepted';
  ELSE
    v_final_status := 'partial_accepted';
  END IF;

  -- 5. Update shipment
  UPDATE shipments
  SET status = v_final_status,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_shipment_id;

  RETURN jsonb_build_object(
    'status', v_final_status::text,
    'items_created', v_items_created,
    'shipment_id', p_shipment_id
  );
END;
$$;

-- =============================================================
-- CRIT-07: fn_adjust_inventory — store signed quantity, use 'adjustment' type
-- Remove ABS() so the sign is preserved in the quantity field.
-- cost_total also uses signed value.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_adjust_inventory(
  p_item_id UUID,
  p_user_id UUID,
  p_quantity_change DECIMAL,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item          RECORD;
  v_new_qty       DECIMAL;
  v_tx_id         UUID;
BEGIN
  -- 1. Lock and verify item
  SELECT * INTO v_item
  FROM inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  IF v_item.lot_status = 'depleted' THEN
    RAISE EXCEPTION 'Cannot adjust a depleted lot';
  END IF;

  IF p_quantity_change = 0 THEN
    RAISE EXCEPTION 'Adjustment quantity cannot be zero';
  END IF;

  -- 2. Calculate new quantity
  v_new_qty := v_item.quantity_available + p_quantity_change;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Insufficient quantity: available=%, adjustment=%',
      v_item.quantity_available, p_quantity_change;
  END IF;

  -- 3. Create adjustment transaction (signed quantity preserved)
  INSERT INTO inventory_transactions (
    company_id, type, inventory_item_id, quantity, unit_id,
    zone_id, cost_per_unit, cost_total, user_id, reason
  ) VALUES (
    v_item.company_id, 'adjustment', p_item_id,
    p_quantity_change, v_item.unit_id,
    v_item.zone_id, v_item.cost_per_unit,
    COALESCE(v_item.cost_per_unit, 0) * p_quantity_change,
    p_user_id, p_reason
  )
  RETURNING id INTO v_tx_id;

  -- 4. Update item balance
  UPDATE inventory_items
  SET quantity_available = v_new_qty,
      lot_status = CASE
        WHEN v_new_qty = 0
         AND quantity_reserved = 0
         AND quantity_committed = 0
        THEN 'depleted'::lot_status
        ELSE lot_status
      END,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_item_id;

  RETURN jsonb_build_object(
    'transaction_id', v_tx_id,
    'inventory_item_id', p_item_id,
    'previous_quantity', v_item.quantity_available,
    'new_quantity', v_new_qty,
    'adjustment', p_quantity_change
  );
END;
$$;

-- =============================================================
-- CRIT-08: fn_transfer_inventory — reuse existing destination item
-- Before creating a new inventory item at destination, check if one
-- already exists with same product_id, zone_id, batch_number,
-- cost_per_unit, and lot_status != 'depleted'. If found, UPDATE
-- quantity_available += p_quantity instead of INSERT.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_transfer_inventory(
  p_source_item_id UUID,
  p_user_id UUID,
  p_quantity DECIMAL,
  p_target_zone_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source        RECORD;
  v_new_src_qty   DECIMAL;
  v_dest_item_id  UUID;
  v_tx_out_id     UUID;
  v_tx_in_id      UUID;
BEGIN
  -- 1. Lock and verify source item
  SELECT * INTO v_source
  FROM inventory_items
  WHERE id = p_source_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source inventory item not found';
  END IF;

  IF v_source.lot_status = 'depleted' THEN
    RAISE EXCEPTION 'Cannot transfer from a depleted lot';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be positive';
  END IF;

  IF p_quantity > v_source.quantity_available THEN
    RAISE EXCEPTION 'Insufficient quantity: available=%, requested=%',
      v_source.quantity_available, p_quantity;
  END IF;

  IF p_target_zone_id = v_source.zone_id THEN
    RAISE EXCEPTION 'Target zone must be different from source zone';
  END IF;

  -- 2. Deduct from source
  v_new_src_qty := v_source.quantity_available - p_quantity;

  UPDATE inventory_items
  SET quantity_available = v_new_src_qty,
      lot_status = CASE
        WHEN v_new_src_qty = 0
         AND quantity_reserved = 0
         AND quantity_committed = 0
        THEN 'depleted'::lot_status
        ELSE lot_status
      END,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_source_item_id;

  -- 3. Check for existing destination item with matching attributes
  SELECT id INTO v_dest_item_id
  FROM inventory_items
  WHERE company_id = v_source.company_id
    AND product_id = v_source.product_id
    AND zone_id = p_target_zone_id
    AND COALESCE(batch_number, '') = COALESCE(v_source.batch_number, '')
    AND COALESCE(cost_per_unit, 0) = COALESCE(v_source.cost_per_unit, 0)
    AND lot_status != 'depleted'
  FOR UPDATE
  LIMIT 1;

  IF v_dest_item_id IS NOT NULL THEN
    -- Update existing item quantity
    UPDATE inventory_items
    SET quantity_available = quantity_available + p_quantity,
        updated_at = now(),
        updated_by = p_user_id
    WHERE id = v_dest_item_id;
  ELSE
    -- Create new destination item
    INSERT INTO inventory_items (
      company_id, product_id, zone_id, quantity_available, unit_id,
      batch_number, supplier_lot_number, cost_per_unit, expiration_date,
      source_type, lot_status, created_by
    ) VALUES (
      v_source.company_id, v_source.product_id, p_target_zone_id,
      p_quantity, v_source.unit_id,
      v_source.batch_number || '-T' || to_char(now(), 'YYYYMMDD-HH24MI'),
      v_source.supplier_lot_number, v_source.cost_per_unit,
      v_source.expiration_date,
      'transfer', 'available', p_user_id
    )
    RETURNING id INTO v_dest_item_id;
  END IF;

  -- 4. Create transfer_out transaction on source
  INSERT INTO inventory_transactions (
    company_id, type, inventory_item_id, quantity, unit_id,
    zone_id, target_item_id, cost_per_unit, cost_total,
    user_id, reason
  ) VALUES (
    v_source.company_id, 'transfer_out', p_source_item_id,
    p_quantity, v_source.unit_id,
    v_source.zone_id, v_dest_item_id,
    v_source.cost_per_unit,
    COALESCE(v_source.cost_per_unit, 0) * p_quantity,
    p_user_id, p_reason
  )
  RETURNING id INTO v_tx_out_id;

  -- 5. Create transfer_in transaction on destination
  INSERT INTO inventory_transactions (
    company_id, type, inventory_item_id, quantity, unit_id,
    zone_id, related_transaction_id, cost_per_unit, cost_total,
    user_id, reason
  ) VALUES (
    v_source.company_id, 'transfer_in', v_dest_item_id,
    p_quantity, v_source.unit_id,
    p_target_zone_id, v_tx_out_id,
    v_source.cost_per_unit,
    COALESCE(v_source.cost_per_unit, 0) * p_quantity,
    p_user_id, p_reason
  )
  RETURNING id INTO v_tx_in_id;

  -- 6. Link transfer_out to transfer_in
  UPDATE inventory_transactions
  SET related_transaction_id = v_tx_in_id
  WHERE id = v_tx_out_id;

  RETURN jsonb_build_object(
    'source_item_id', p_source_item_id,
    'destination_item_id', v_dest_item_id,
    'transfer_out_id', v_tx_out_id,
    'transfer_in_id', v_tx_in_id,
    'quantity', p_quantity,
    'source_remaining', v_new_src_qty
  );
END;
$$;

-- =============================================================
-- CRIT-10: fn_approve_production_order
-- Change v_order.initial_quantity::INT to ::DECIMAL so plant_count
-- accepts decimal values.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_approve_production_order(
  p_order_id UUID,
  p_zone_id UUID,
  p_schedule_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order RECORD;
  v_batch_id UUID;
  v_batch_code TEXT;
  v_first_phase_id UUID;
  v_start_date DATE;
BEGIN
  -- 1. Lock order and verify status
  SELECT po.id, po.status, po.cultivar_id, po.entry_phase_id,
         po.initial_quantity, po.planned_start_date
  INTO v_order
  FROM public.production_orders po
  WHERE po.id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Production order not found';
  END IF;

  IF v_order.status != 'draft' THEN
    RAISE EXCEPTION 'Order must be in draft status to approve (current: %)', v_order.status;
  END IF;

  -- 2. Determine start date
  v_start_date := COALESCE(v_order.planned_start_date, CURRENT_DATE);

  -- 3. Insert batch (CRIT-10: removed ::INT cast, use ::DECIMAL)
  INSERT INTO public.batches (
    cultivar_id, zone_id, current_phase_id, production_order_id,
    plant_count, start_date, status, schedule_id,
    created_by, updated_by
  ) VALUES (
    v_order.cultivar_id, p_zone_id, v_order.entry_phase_id, p_order_id,
    v_order.initial_quantity::DECIMAL, v_start_date, 'active', p_schedule_id,
    p_user_id, p_user_id
  )
  RETURNING id, code INTO v_batch_id, v_batch_code;

  -- 4. Update order status -> approved
  UPDATE public.production_orders
  SET status = 'approved', updated_by = p_user_id
  WHERE id = p_order_id;

  -- 5. Update first phase -> status='ready', set batch_id
  SELECT pop.id INTO v_first_phase_id
  FROM public.production_order_phases pop
  WHERE pop.order_id = p_order_id
  ORDER BY pop.sort_order ASC
  LIMIT 1;

  IF v_first_phase_id IS NOT NULL THEN
    UPDATE public.production_order_phases
    SET status = 'ready', batch_id = v_batch_id, updated_by = p_user_id
    WHERE id = v_first_phase_id;
  END IF;

  -- 6. Return result
  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'batch_code', v_batch_code,
    'scheduled_activities_count', 0
  );
END;
$$;

-- =============================================================
-- CRIT-11: fn_check_overdue_activities
-- After marking activities overdue, also create alerts for each one.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_check_overdue_activities()
RETURNS void AS $$
BEGIN
  -- Mark overdue
  UPDATE scheduled_activities
  SET status = 'overdue',
      updated_at = now()
  WHERE status = 'pending'
    AND planned_date < CURRENT_DATE;

  -- Create alerts for newly overdue activities
  INSERT INTO alerts (company_id, type, severity, title, entity_type, entity_id, batch_id, message, triggered_at, status)
  SELECT
    f.company_id,
    'overdue_activity'::alert_type,
    'high'::alert_severity,
    'Actividad vencida: ' || COALESCE(at2.name, 'Actividad programada'),
    'scheduled_activity',
    sa.id,
    sa.batch_id,
    'La actividad "' || COALESCE(at2.name, 'sin nombre') || '" planificada para ' || sa.planned_date::text ||
      ' en batch ' || COALESCE(b.code, sa.batch_id::text) || ' esta vencida.',
    now(),
    'pending'::alert_status
  FROM scheduled_activities sa
  JOIN batches b ON b.id = sa.batch_id
  JOIN zones z ON z.id = b.zone_id
  JOIN facilities f ON f.id = z.facility_id
  LEFT JOIN activity_templates at2 ON at2.id = sa.template_id
  WHERE sa.status = 'overdue'
    AND sa.planned_date < CURRENT_DATE
    -- Avoid duplicate alerts in last 24h
    AND NOT EXISTS (
      SELECT 1 FROM alerts a
      WHERE a.entity_type = 'scheduled_activity'
        AND a.entity_id = sa.id
        AND a.type = 'overdue_activity'
        AND a.triggered_at > now() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- CRIT-12 + Minor (severity calc): fn_check_env_readings
-- Add JOIN sensors and filter by s.is_active = true so inactive
-- sensors don't trigger alerts.
-- Fix severity margin: use (opt_max - opt_min) instead of
-- (COALESCE(opt_max, opt_min) - COALESCE(opt_min, opt_max)).
-- =============================================================
CREATE OR REPLACE FUNCTION fn_check_env_readings()
RETURNS void AS $$
DECLARE
  rec RECORD;
  opt_min DECIMAL;
  opt_max DECIMAL;
  param_key TEXT;
BEGIN
  -- Get latest reading per zone+parameter for active sensors
  FOR rec IN
    SELECT DISTINCT ON (er.zone_id, er.parameter)
      er.zone_id,
      er.sensor_id,
      er.company_id,
      er.parameter,
      er.value,
      er.unit,
      er.timestamp,
      z.name AS zone_name,
      b.id AS batch_id,
      c.optimal_conditions
    FROM environmental_readings er
    JOIN sensors s ON s.id = er.sensor_id
    JOIN zones z ON z.id = er.zone_id
    LEFT JOIN batches b ON b.zone_id = er.zone_id AND b.status = 'active'
    LEFT JOIN cultivars c ON c.id = b.cultivar_id
    WHERE er.timestamp > now() - INTERVAL '30 minutes'
      AND s.is_active = true
      AND c.optimal_conditions IS NOT NULL
    ORDER BY er.zone_id, er.parameter, er.timestamp DESC
  LOOP
    -- Map env_parameter to optimal_conditions JSON key
    param_key := rec.parameter::text;
    IF NOT (rec.optimal_conditions ? param_key) THEN
      -- Try common aliases
      CASE param_key
        WHEN 'temperature' THEN param_key := 'temp';
        WHEN 'light_ppfd' THEN param_key := 'light';
        ELSE NULL;
      END CASE;
    END IF;

    -- Extract min/max from cultivar optimal_conditions JSONB
    opt_min := (rec.optimal_conditions -> param_key ->> 'min')::DECIMAL;
    opt_max := (rec.optimal_conditions -> param_key ->> 'max')::DECIMAL;

    -- Skip if no optimal range defined for this parameter
    IF opt_min IS NULL AND opt_max IS NULL THEN
      CONTINUE;
    END IF;

    -- Check if out of range
    IF (opt_min IS NOT NULL AND rec.value < opt_min) OR (opt_max IS NOT NULL AND rec.value > opt_max) THEN
      -- Avoid duplicate alerts in last 30 minutes
      IF NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.entity_type = 'sensor'
          AND a.entity_id = rec.sensor_id
          AND a.type = 'env_out_of_range'
          AND a.triggered_at > now() - INTERVAL '30 minutes'
      ) THEN
        INSERT INTO alerts (company_id, type, severity, title, entity_type, entity_id, batch_id, message, triggered_at, status)
        VALUES (
          rec.company_id,
          'env_out_of_range'::alert_type,
          CASE
            -- Minor fix: use (opt_max - opt_min) for correct 20% margin
            WHEN rec.value < COALESCE(opt_min, rec.value) - (opt_max - opt_min) * 0.2
              OR rec.value > COALESCE(opt_max, rec.value) + (opt_max - opt_min) * 0.2
            THEN 'critical'::alert_severity
            ELSE 'high'::alert_severity
          END,
          rec.zone_name || ': ' || param_key || ' fuera de rango',
          'sensor',
          rec.sensor_id,
          rec.batch_id,
          param_key || ' = ' || rec.value || ' ' || rec.unit ||
            ' (rango optimo: ' || COALESCE(opt_min::text, '?') || ' - ' || COALESCE(opt_max::text, '?') || ')' ||
            ' en zona ' || rec.zone_name || '.',
          now(),
          'pending'::alert_status
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- CRIT-13: calculate_batch_cogs — fix per_zone denominator
-- Change COUNT(DISTINCT bd2.zone_id) to count batches in the
-- SAME zone as the current batch distribution.
-- =============================================================
CREATE OR REPLACE FUNCTION calculate_batch_cogs(
  p_company_id UUID,
  p_facility_id UUID DEFAULT NULL,
  p_batch_status batch_status DEFAULT NULL
)
RETURNS TABLE (
  batch_id UUID,
  batch_code VARCHAR,
  direct_cost DECIMAL,
  overhead_allocated DECIMAL,
  total_cogs DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH batch_direct AS (
    SELECT
      b.id AS batch_id,
      b.code AS batch_code,
      b.total_cost AS direct_cost,
      b.zone_id,
      b.area_m2,
      b.plant_count,
      z.facility_id
    FROM batches b
    JOIN zones z ON z.id = b.zone_id
    JOIN facilities f ON f.id = z.facility_id
    WHERE f.company_id = p_company_id
      AND (p_facility_id IS NULL OR z.facility_id = p_facility_id)
      AND (p_batch_status IS NULL OR b.status = p_batch_status)
  ),
  overhead AS (
    SELECT
      oc.id AS cost_id,
      oc.facility_id,
      oc.zone_id AS cost_zone_id,
      oc.amount,
      oc.allocation_basis,
      oc.period_start,
      oc.period_end
    FROM overhead_costs oc
    WHERE oc.company_id = p_company_id
      AND (p_facility_id IS NULL OR oc.facility_id = p_facility_id)
  ),
  active_batches_per_facility AS (
    SELECT
      bd.facility_id,
      COUNT(DISTINCT bd.batch_id) AS batch_count,
      SUM(COALESCE(bd.area_m2, 0)) AS total_area,
      SUM(COALESCE(bd.plant_count, 0)) AS total_plants
    FROM batch_direct bd
    GROUP BY bd.facility_id
  ),
  allocated AS (
    SELECT
      bd.batch_id,
      SUM(
        CASE o.allocation_basis
          WHEN 'even_split' THEN
            o.amount / GREATEST(af.batch_count, 1)
          WHEN 'per_m2' THEN
            CASE WHEN af.total_area > 0
              THEN o.amount * COALESCE(bd.area_m2, 0) / af.total_area
              ELSE o.amount / GREATEST(af.batch_count, 1)
            END
          WHEN 'per_plant' THEN
            CASE WHEN af.total_plants > 0
              THEN o.amount * COALESCE(bd.plant_count, 0) / af.total_plants
              ELSE o.amount / GREATEST(af.batch_count, 1)
            END
          WHEN 'per_batch' THEN
            o.amount / GREATEST(af.batch_count, 1)
          WHEN 'per_zone' THEN
            -- CRIT-13: divide by count of batches in the SAME zone, not total distinct zones
            o.amount / GREATEST(
              (SELECT COUNT(*) FROM batch_direct bd2 WHERE bd2.facility_id = bd.facility_id AND bd2.zone_id = bd.zone_id), 1
            )
          ELSE 0
        END
      ) AS overhead_total
    FROM batch_direct bd
    JOIN overhead o ON o.facility_id = bd.facility_id
      AND (o.cost_zone_id IS NULL OR o.cost_zone_id = bd.zone_id)
    JOIN active_batches_per_facility af ON af.facility_id = bd.facility_id
    GROUP BY bd.batch_id
  )
  SELECT
    bd.batch_id,
    bd.batch_code,
    ROUND(bd.direct_cost, 2) AS direct_cost,
    ROUND(COALESCE(al.overhead_total, 0), 2) AS overhead_allocated,
    ROUND(bd.direct_cost + COALESCE(al.overhead_total, 0), 2) AS total_cogs
  FROM batch_direct bd
  LEFT JOIN allocated al ON al.batch_id = bd.batch_id
  ORDER BY bd.batch_code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================
-- DM-10: Composite indexes on inventory_transactions
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_batch
  ON inventory_transactions(company_id, batch_id, type, timestamp);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_zone
  ON inventory_transactions(company_id, zone_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_item
  ON inventory_transactions(company_id, inventory_item_id, timestamp);
