-- =============================================================================
-- Migration: 0012_clinic_encounter_storage
-- Private audio bucket for ambient scribe — patient-scoped RLS + expiry metadata
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic_encounters_audio',
  'clinic_encounters_audio',
  false,
  104857600,
  ARRAY[
    'audio/wav',
    'audio/x-wav',
    'audio/mpeg',
    'audio/mp4',
    'audio/webm',
    'audio/ogg'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- RLS: storage.objects — clinic_encounters_audio bucket
-- Path convention: {patient_id}/{encounter_id}/{filename}
-- ---------------------------------------------------------------------------

CREATE POLICY clinic_encounters_audio_service_role_select
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'clinic_encounters_audio');

CREATE POLICY clinic_encounters_audio_service_role_insert
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'clinic_encounters_audio');

CREATE POLICY clinic_encounters_audio_service_role_update
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'clinic_encounters_audio')
  WITH CHECK (bucket_id = 'clinic_encounters_audio');

CREATE POLICY clinic_encounters_audio_service_role_delete
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'clinic_encounters_audio');

-- Patients may not read raw encounter audio once pipeline completes; during review
-- only service_role retains access until audio_deleted_at is set.
CREATE POLICY clinic_encounters_audio_patient_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clinic_encounters_audio'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Auto-expire helper: flag encounters whose audio TTL has elapsed
-- (Deletion executed by transcribePipeline.server.ts / cleanup cron)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clinic_encounters_mark_expired_audio()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.clinic_encounters
  SET
    status = CASE
      WHEN status = 'draft' THEN 'failed'::public.clinic_encounter_status
      ELSE status
    END,
    failure_reason = COALESCE(
      failure_reason,
      'Raw audio retention window expired before transcription completed.'
    ),
    updated_at = now()
  WHERE audio_storage_path IS NOT NULL
    AND audio_deleted_at IS NULL
    AND audio_expires_at IS NOT NULL
    AND audio_expires_at <= now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

COMMENT ON FUNCTION public.clinic_encounters_mark_expired_audio IS
  'Marks encounters with expired raw audio for pipeline cleanup. Does not delete storage objects.';

REVOKE ALL ON FUNCTION public.clinic_encounters_mark_expired_audio() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinic_encounters_mark_expired_audio() TO service_role;
