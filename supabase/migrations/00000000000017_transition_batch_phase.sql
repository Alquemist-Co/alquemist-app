-- =============================================================
-- Migration 17: fn_transition_batch_phase (PRD 25)
-- Atomic: lock batch → complete current phase → start next phase → update batch
-- =============================================================

CREATE OR REPLACE FUNCTION fn_transition_batch_phase(
  p_batch_id UUID,
  p_zone_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_batch RECORD;
  v_current_phase RECORD;
  v_next_phase RECORD;
  v_new_phase_name TEXT;
  v_is_final BOOLEAN := false;
BEGIN
  -- 1. Lock batch and verify status
  SELECT b.id, b.status, b.production_order_id, b.current_phase_id, b.zone_id
  INTO v_batch
  FROM public.batches b
  WHERE b.id = p_batch_id
  FOR UPDATE;

  IF v_batch IS NULL THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  IF v_batch.status != 'active' THEN
    RAISE EXCEPTION 'Batch must be active to transition (current: %)', v_batch.status;
  END IF;

  IF v_batch.production_order_id IS NULL THEN
    RAISE EXCEPTION 'Batch has no production order — cannot determine phases';
  END IF;

  -- 2. Find current order phase (in_progress or ready)
  SELECT pop.id, pop.phase_id, pop.sort_order
  INTO v_current_phase
  FROM public.production_order_phases pop
  WHERE pop.order_id = v_batch.production_order_id
    AND pop.status IN ('in_progress', 'ready')
  ORDER BY pop.sort_order ASC
  LIMIT 1;

  IF v_current_phase IS NULL THEN
    RAISE EXCEPTION 'No active phase found for this batch';
  END IF;

  -- 3. Find next phase (next sort_order that is not completed/skipped)
  SELECT pop.id, pop.phase_id, pop.sort_order, pp.name AS phase_name
  INTO v_next_phase
  FROM public.production_order_phases pop
  JOIN public.production_phases pp ON pp.id = pop.phase_id
  WHERE pop.order_id = v_batch.production_order_id
    AND pop.sort_order > v_current_phase.sort_order
    AND pop.status NOT IN ('completed', 'skipped')
  ORDER BY pop.sort_order ASC
  LIMIT 1;

  -- 4. Mark current phase as completed
  UPDATE public.production_order_phases
  SET status = 'completed',
      actual_end_date = CURRENT_DATE,
      updated_by = p_user_id
  WHERE id = v_current_phase.id;

  IF v_next_phase IS NULL THEN
    -- 5a. No next phase — this is the final transition
    v_is_final := true;

    -- Complete batch
    UPDATE public.batches
    SET status = 'completed', updated_by = p_user_id
    WHERE id = p_batch_id;

    -- Complete order
    UPDATE public.production_orders
    SET status = 'completed', updated_by = p_user_id
    WHERE id = v_batch.production_order_id;

    -- Get current phase name for response
    SELECT pp.name INTO v_new_phase_name
    FROM public.production_phases pp
    WHERE pp.id = v_current_phase.phase_id;

    RETURN jsonb_build_object(
      'new_phase_id', NULL,
      'new_phase_name', v_new_phase_name,
      'batch_status', 'completed',
      'is_final', true
    );
  END IF;

  -- 5b. Advance to next phase
  v_new_phase_name := v_next_phase.phase_name;

  -- Mark next phase as in_progress
  UPDATE public.production_order_phases
  SET status = 'in_progress',
      actual_start_date = CURRENT_DATE,
      batch_id = p_batch_id,
      updated_by = p_user_id
  WHERE id = v_next_phase.id;

  -- Update batch: phase + optional zone
  UPDATE public.batches
  SET current_phase_id = v_next_phase.phase_id,
      zone_id = COALESCE(p_zone_id, zone_id),
      updated_by = p_user_id
  WHERE id = p_batch_id;

  -- If order is still 'approved', move to 'in_progress'
  UPDATE public.production_orders
  SET status = 'in_progress', updated_by = p_user_id
  WHERE id = v_batch.production_order_id
    AND status = 'approved';

  RETURN jsonb_build_object(
    'new_phase_id', v_next_phase.phase_id,
    'new_phase_name', v_new_phase_name,
    'batch_status', 'active',
    'is_final', false
  );
END;
$$;
