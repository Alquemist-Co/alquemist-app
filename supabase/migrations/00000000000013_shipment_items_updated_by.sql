-- Add missing updated_by column to shipment_items.
-- The trigger_update_timestamps trigger sets NEW.updated_by = auth.uid(),
-- but shipment_items was created without this column, causing errors
-- when fn_confirm_shipment_receipt updates shipment_items rows.

ALTER TABLE shipment_items
  ADD COLUMN updated_by UUID REFERENCES auth.users(id);
