-- Storage bucket for company logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
);

-- RLS: admin can upload/update logos for their company
CREATE POLICY "company_logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) = 'admin'
  );

CREATE POLICY "company_logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) = 'admin'
  );

CREATE POLICY "company_logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::text
    AND (SELECT get_my_role()) = 'admin'
  );

-- RLS: public read for company logos (bucket is public)
CREATE POLICY "company_logos_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'company-logos');
