-- =============================================================================
-- Migration: 0011_clinic_encounters
-- Ambient AI scribe — telehealth encounters, transcripts, immutable audit log
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enum: encounter lifecycle (HealthScribe pipeline)
-- ---------------------------------------------------------------------------
CREATE TYPE public.clinic_encounter_status AS ENUM (
  'draft',
  'processing',
  'review',
  'finalized',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Table: clinic_encounters
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles (id) ON DELETE CASCADE,
  provider_uid TEXT,
  medical_intake_id UUID REFERENCES public.medical_intakes (id) ON DELETE SET NULL,
  status public.clinic_encounter_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL DEFAULT 'Telehealth encounter',
  audio_storage_path TEXT,
  audio_mime_type TEXT,
  audio_expires_at TIMESTAMPTZ,
  audio_deleted_at TIMESTAMPTZ,
  healthscribe_job_id TEXT,
  healthscribe_job_status TEXT,
  failure_reason TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_encounters_title_not_empty_chk CHECK (length(trim(title)) > 0),
  CONSTRAINT clinic_encounters_provider_uid_len_chk CHECK (
    provider_uid IS NULL OR length(trim(provider_uid)) > 0
  ),
  CONSTRAINT clinic_encounters_audio_path_len_chk CHECK (
    audio_storage_path IS NULL OR length(trim(audio_storage_path)) > 0
  ),
  CONSTRAINT clinic_encounters_failure_reason_len_chk CHECK (
    failure_reason IS NULL OR length(failure_reason) <= 4000
  )
);

COMMENT ON TABLE public.clinic_encounters IS
  'Telehealth ambient-AI encounters. Raw audio is ephemeral; transcripts persist after HIPAA deletion.';

COMMENT ON COLUMN public.clinic_encounters.audio_storage_path IS
  'Supabase Storage object path in clinic_encounters_audio bucket (patient_id/encounter_id/*).';

COMMENT ON COLUMN public.clinic_encounters.audio_expires_at IS
  'Hard TTL for raw audio retention; pipeline must delete before or at this timestamp.';

COMMENT ON COLUMN public.clinic_encounters.audio_deleted_at IS
  'Set when raw audio is purged from Supabase Storage and AWS input staging.';

CREATE INDEX clinic_encounters_patient_created_idx
  ON public.clinic_encounters (patient_id, created_at DESC);

CREATE INDEX clinic_encounters_status_idx
  ON public.clinic_encounters (status, updated_at DESC);

CREATE INDEX clinic_encounters_audio_expiry_idx
  ON public.clinic_encounters (audio_expires_at)
  WHERE audio_storage_path IS NOT NULL AND audio_deleted_at IS NULL;

CREATE UNIQUE INDEX clinic_encounters_healthscribe_job_uidx
  ON public.clinic_encounters (healthscribe_job_id)
  WHERE healthscribe_job_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Table: clinic_encounter_transcripts
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_encounter_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.clinic_encounters (id) ON DELETE CASCADE,
  transcript_text TEXT NOT NULL,
  structured_note JSONB NOT NULL DEFAULT '{}'::jsonb,
  speaker_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  clinical_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_id TEXT,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_encounter_transcripts_text_not_empty_chk CHECK (
    length(trim(transcript_text)) > 0
  )
);

COMMENT ON TABLE public.clinic_encounter_transcripts IS
  'Structured clinical documentation generated from ambient AI (post audio deletion).';

CREATE UNIQUE INDEX clinic_encounter_transcripts_encounter_uidx
  ON public.clinic_encounter_transcripts (encounter_id);

-- ---------------------------------------------------------------------------
-- Table: clinic_encounter_audit_log (immutable)
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_encounter_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.clinic_encounters (id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_uid TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_encounter_audit_log_action_not_empty_chk CHECK (
    length(trim(action)) > 0
  ),
  CONSTRAINT clinic_encounter_audit_log_action_len_chk CHECK (length(action) <= 120)
);

COMMENT ON TABLE public.clinic_encounter_audit_log IS
  'Immutable HIPAA audit trail for encounter audio handling and transcription events.';

CREATE INDEX clinic_encounter_audit_log_encounter_created_idx
  ON public.clinic_encounter_audit_log (encounter_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER clinic_encounters_set_updated_at
  BEFORE UPDATE ON public.clinic_encounters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.clinic_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_encounter_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_encounter_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinic_encounters FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_encounter_transcripts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_encounter_audit_log FORCE ROW LEVEL SECURITY;

-- Patients: read own encounters in review/finalized only (no draft/processing audio metadata)
CREATE POLICY clinic_encounters_select_own_released
  ON public.clinic_encounters
  FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    AND status IN ('review', 'finalized')
  );

CREATE POLICY clinic_encounter_transcripts_select_own
  ON public.clinic_encounter_transcripts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_encounters encounter
      WHERE encounter.id = encounter_id
        AND encounter.patient_id = auth.uid()
        AND encounter.status IN ('review', 'finalized')
    )
  );

-- Service role: clinical ops + ambient pipeline
CREATE POLICY clinic_encounters_service_role_all
  ON public.clinic_encounters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY clinic_encounter_transcripts_service_role_all
  ON public.clinic_encounter_transcripts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY clinic_encounter_audit_log_service_role_all
  ON public.clinic_encounter_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.clinic_encounters TO authenticated;
GRANT SELECT ON public.clinic_encounter_transcripts TO authenticated;
GRANT ALL ON public.clinic_encounters TO service_role;
GRANT ALL ON public.clinic_encounter_transcripts TO service_role;
GRANT ALL ON public.clinic_encounter_audit_log TO service_role;
GRANT USAGE ON TYPE public.clinic_encounter_status TO authenticated, service_role;
