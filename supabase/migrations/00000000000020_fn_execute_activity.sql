-- Migration 20: fn_execute_activity — atomic activity execution
-- Called by Edge Function execute-activity

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
