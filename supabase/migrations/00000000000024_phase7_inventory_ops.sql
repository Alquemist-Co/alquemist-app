-- =============================================================
-- Phase 7: Inventory Operations — SQL functions
-- fn_adjust_inventory + fn_transfer_inventory
-- Called by Edge Functions adjust-inventory / transfer-inventory
-- =============================================================

-- =============================================================
-- fn_adjust_inventory — atomic inventory adjustment
-- Creates an adjustment transaction and updates the item balance.
-- p_quantity_change can be positive (add) or negative (remove).
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

  -- 3. Create adjustment transaction
  INSERT INTO inventory_transactions (
    company_id, type, inventory_item_id, quantity, unit_id,
    zone_id, cost_per_unit, cost_total, user_id, reason
  ) VALUES (
    v_item.company_id, 'adjustment', p_item_id,
    ABS(p_quantity_change), v_item.unit_id,
    v_item.zone_id, v_item.cost_per_unit,
    COALESCE(v_item.cost_per_unit, 0) * ABS(p_quantity_change),
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
-- fn_transfer_inventory — atomic transfer between zones
-- Creates a transfer_out + transfer_in pair and a new item
-- in the destination zone.
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

  -- 3. Create destination item
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
