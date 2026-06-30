-- =============================================================================
-- Migration: 0009_clinic_storage_buckets
-- Private Supabase Storage bucket for patient lab documents (HIPAA-scoped RLS)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic_labs',
  'clinic_labs',
  false,
  12582912,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS: storage.objects — clinic_labs bucket
-- ---------------------------------------------------------------------------

CREATE POLICY clinic_labs_service_role_select
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'clinic_labs');

CREATE POLICY clinic_labs_service_role_insert
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'clinic_labs');

CREATE POLICY clinic_labs_service_role_update
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'clinic_labs')
  WITH CHECK (bucket_id = 'clinic_labs');

CREATE POLICY clinic_labs_service_role_delete
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'clinic_labs');

-- Patients may only read objects under their auth.uid() folder prefix.
CREATE POLICY clinic_labs_patient_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clinic_labs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
