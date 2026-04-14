-- Migration 27: Batch status control via activities
-- Activity types and templates for Hold/Cancel/Reactivate batch actions
-- Extends fn_execute_activity to handle batch_status_action in template metadata

-- =============================================================
-- 1. Activity types for batch status control (per company)
-- =============================================================

-- Note: These are created per company by a function, not global.
-- We add three new activity types: Pausa, Cancelacion, Reactivacion.
-- Category 'control' groups them with inspection/quality activities.

CREATE OR REPLACE FUNCTION create_batch_status_activity_types()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company RECORD;
  v_atype_hold UUID;
  v_atype_cancel UUID;
  v_atype_reactivate UUID;
BEGIN
  FOR v_company IN SELECT id FROM companies LOOP
    -- Check if already exists (idempotent)
    SELECT id INTO v_atype_hold
    FROM activity_types
    WHERE company_id = v_company.id AND name = 'Pausa de lote';

    IF v_atype_hold IS NULL THEN
      INSERT INTO activity_types (company_id, name, category, is_active)
      VALUES (v_company.id, 'Pausa de lote', 'control', true)
      RETURNING id INTO v_atype_hold;
    END IF;

    SELECT id INTO v_atype_cancel
    FROM activity_types
    WHERE company_id = v_company.id AND name = 'Cancelacion de lote';

    IF v_atype_cancel IS NULL THEN
      INSERT INTO activity_types (company_id, name, category, is_active)
      VALUES (v_company.id, 'Cancelacion de lote', 'control', true)
      RETURNING id INTO v_atype_cancel;
    END IF;

    SELECT id INTO v_atype_reactivate
    FROM activity_types
    WHERE company_id = v_company.id AND name = 'Reactivacion de lote';

    IF v_atype_reactivate IS NULL THEN
      INSERT INTO activity_types (company_id, name, category, is_active)
      VALUES (v_company.id, 'Reactivacion de lote', 'control', true)
      RETURNING id INTO v_atype_reactivate;
    END IF;

    -- Create templates if not exist
    INSERT INTO activity_templates (company_id, code, activity_type_id, name, frequency, estimated_duration_min, metadata)
    SELECT v_company.id, 'BATCH_HOLD', v_atype_hold, 'Pausa de lote', 'on_demand', 5,
           '{"batch_status_action": "on_hold", "skip_checklist": true}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_templates WHERE company_id = v_company.id AND code = 'BATCH_HOLD'
    );

    INSERT INTO activity_templates (company_id, code, activity_type_id, name, frequency, estimated_duration_min, metadata)
    SELECT v_company.id, 'BATCH_CANCEL', v_atype_cancel, 'Cancelacion de lote', 'on_demand', 5,
           '{"batch_status_action": "cancelled", "skip_checklist": true}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_templates WHERE company_id = v_company.id AND code = 'BATCH_CANCEL'
    );

    INSERT INTO activity_templates (company_id, code, activity_type_id, name, frequency, estimated_duration_min, metadata)
    SELECT v_company.id, 'BATCH_REACTIVATE', v_atype_reactivate, 'Reactivacion de lote', 'on_demand', 5,
           '{"batch_status_action": "active", "skip_checklist": true}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_templates WHERE company_id = v_company.id AND code = 'BATCH_REACTIVATE'
    );
  END LOOP;
END;
$$;

-- Execute for existing companies
SELECT create_batch_status_activity_types();

-- =============================================================
-- 2. Extended fn_execute_activity with batch_status_action support
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
  v_status_changed BOOLEAN := FALSE;
  v_template_triggers_phase UUID;
  v_batch_status_action TEXT;
  v_combined_data JSONB;
BEGIN
  -- 1. Lock and verify scheduled_activity
  SELECT sa.*, at2.triggers_phase_change_id, at2.metadata
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

  -- Extract batch_status_action from template metadata
  v_batch_status_action := v_sa.metadata->>'batch_status_action';

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
      INSERT INTO inventory_transactions (
        item_id, type, quantity, performed_by, notes, created_by
      ) VALUES (
        v_resource.inventory_item_id,
        'consumption',
        v_resource.quantity_actual,
        p_performed_by,
        'Consumo por actividad ' || v_activity_id::text,
        p_performed_by
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

  -- 7. Handle batch_status_action (Hold/Cancel/Reactivate)
  IF v_batch_status_action IS NOT NULL THEN
    UPDATE batches
    SET status = v_batch_status_action::batch_status,
        updated_by = p_performed_by
    WHERE id = p_batch_id;

    v_status_changed := TRUE;
  END IF;

  -- 8. Optional phase transition (only if no status change action)
  IF v_template_triggers_phase IS NOT NULL AND v_batch_status_action IS NULL THEN
    BEGIN
      PERFORM fn_transition_batch_phase(p_batch_id, p_performed_by);
      v_phase_changed := TRUE;
    EXCEPTION WHEN OTHERS THEN
      -- Phase transition failure shouldn't block activity completion
      RAISE WARNING 'Phase transition failed: %', SQLERRM;
    END;
  END IF;

  -- 9. Return result
  RETURN jsonb_build_object(
    'activity_id', v_activity_id,
    'transactions_created', v_transactions_created,
    'phase_changed', v_phase_changed,
    'status_changed', v_status_changed,
    'new_status', v_batch_status_action
  );
END;
$$;

-- =============================================================
-- 3. Trigger to create activity types for new companies
-- =============================================================

CREATE OR REPLACE FUNCTION trigger_create_company_batch_status_types()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_atype_hold UUID;
  v_atype_cancel UUID;
  v_atype_reactivate UUID;
BEGIN
  -- Create activity types for batch status control
  INSERT INTO activity_types (company_id, name, category, is_active)
  VALUES (NEW.id, 'Pausa de lote', 'control', true)
  RETURNING id INTO v_atype_hold;

  INSERT INTO activity_types (company_id, name, category, is_active)
  VALUES (NEW.id, 'Cancelacion de lote', 'control', true)
  RETURNING id INTO v_atype_cancel;

  INSERT INTO activity_types (company_id, name, category, is_active)
  VALUES (NEW.id, 'Reactivacion de lote', 'control', true)
  RETURNING id INTO v_atype_reactivate;

  -- Create templates
  INSERT INTO activity_templates (company_id, code, activity_type_id, name, frequency, estimated_duration_min, metadata)
  VALUES
    (NEW.id, 'BATCH_HOLD', v_atype_hold, 'Pausa de lote', 'on_demand', 5,
     '{"batch_status_action": "on_hold", "skip_checklist": true}'::jsonb),
    (NEW.id, 'BATCH_CANCEL', v_atype_cancel, 'Cancelacion de lote', 'on_demand', 5,
     '{"batch_status_action": "cancelled", "skip_checklist": true}'::jsonb),
    (NEW.id, 'BATCH_REACTIVATE', v_atype_reactivate, 'Reactivacion de lote', 'on_demand', 5,
     '{"batch_status_action": "active", "skip_checklist": true}'::jsonb);

  RETURN NEW;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_company_batch_status_types ON companies;

CREATE TRIGGER trg_company_batch_status_types
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_company_batch_status_types();
