-- Fase 2: Schema additions for Inventory & Quality modules

-- Add min_stock_threshold to products (for low-stock alerts)
ALTER TABLE products ADD COLUMN min_stock_threshold DECIMAL;

-- Add certificate_url to quality_tests (for PDF upload)
ALTER TABLE quality_tests ADD COLUMN certificate_url TEXT;

-- Create storage bucket for quality certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('quality-certificates', 'quality-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for quality-certificates bucket (authenticated users can read/write)
CREATE POLICY "Authenticated users can upload certificates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quality-certificates');

CREATE POLICY "Authenticated users can read certificates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'quality-certificates');
