-- fn_transaction_kpis: aggregate counts and cost sums for transaction categories
-- Replaces client-side summing which breaks at >1000 rows (PostgREST default limit)

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
  WHERE (p_zone_id IS NULL OR zone_id = p_zone_id)
    AND (p_batch_id IS NULL OR batch_id = p_batch_id)
    AND (p_item_id IS NULL OR inventory_item_id = p_item_id)
    AND (p_from IS NULL OR timestamp >= p_from)
    AND (p_to IS NULL OR timestamp <= p_to);

  RETURN v_result;
END;
$$;
