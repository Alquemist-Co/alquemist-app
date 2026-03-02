-- Add DEFAULT to shipment_code so Supabase generated Insert types make it optional.
-- The column is NOT NULL + trigger-generated (trg_shipment_code_auto), so inserts
-- must provide a placeholder. With DEFAULT '' the column becomes optional in TS types,
-- and the trigger overwrites it with the real code before the row is visible.
ALTER TABLE shipments ALTER COLUMN shipment_code SET DEFAULT '';
