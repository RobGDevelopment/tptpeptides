-- =============================================================================
-- Migration: 0008_clinic_care_tab
-- Patient portal — secure messaging and lab results (HIPAA-scoped RLS)
-- =============================================================================

CREATE TYPE public.clinic_message_sender_role AS ENUM (
  'patient',
  'provider'
);

CREATE TYPE public.clinic_lab_result_status AS ENUM (
  'pending',
  'reviewed'
);

-- ---------------------------------------------------------------------------
-- Table: clinic_messages
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles (id) ON DELETE CASCADE,
  provider_uid TEXT,
  sender_role public.clinic_message_sender_role NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_messages_content_not_empty_chk CHECK (length(trim(content)) > 0),
  CONSTRAINT clinic_messages_content_len_chk CHECK (length(content) <= 4000),
  CONSTRAINT clinic_messages_provider_sender_chk CHECK (
    (sender_role = 'provider' AND provider_uid IS NOT NULL AND length(trim(provider_uid)) > 0)
    OR (sender_role = 'patient' AND provider_uid IS NULL)
  )
);

COMMENT ON TABLE public.clinic_messages IS
  'HIPAA-scoped async messaging between patients and clinical operations.';

CREATE INDEX clinic_messages_patient_created_idx
  ON public.clinic_messages (patient_id, created_at ASC);

CREATE INDEX clinic_messages_patient_unread_idx
  ON public.clinic_messages (patient_id, read_at)
  WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- Table: clinic_lab_results
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status public.clinic_lab_result_status NOT NULL DEFAULT 'pending',
  file_url TEXT NOT NULL,
  provider_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_lab_results_title_not_empty_chk CHECK (length(trim(title)) > 0),
  CONSTRAINT clinic_lab_results_file_url_len_chk CHECK (length(trim(file_url)) > 0)
);

COMMENT ON TABLE public.clinic_lab_results IS
  'Patient lab documents released by providers after clinical review.';

CREATE INDEX clinic_lab_results_patient_created_idx
  ON public.clinic_lab_results (patient_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.clinic_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_lab_results ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinic_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_lab_results FORCE ROW LEVEL SECURITY;

-- Patients: read own thread
CREATE POLICY clinic_messages_select_own
  ON public.clinic_messages
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Patients: send messages as patient only
CREATE POLICY clinic_messages_insert_patient
  ON public.clinic_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = auth.uid()
    AND sender_role = 'patient'
    AND provider_uid IS NULL
  );

-- Patients: read own lab results
CREATE POLICY clinic_lab_results_select_own
  ON public.clinic_lab_results
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Service role: provider ops + webhooks
CREATE POLICY clinic_messages_service_role_all
  ON public.clinic_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY clinic_lab_results_service_role_all
  ON public.clinic_lab_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT ON public.clinic_messages TO authenticated;
GRANT SELECT ON public.clinic_lab_results TO authenticated;
GRANT ALL ON public.clinic_messages TO service_role;
GRANT ALL ON public.clinic_lab_results TO service_role;
GRANT USAGE ON TYPE public.clinic_message_sender_role TO authenticated, service_role;
GRANT USAGE ON TYPE public.clinic_lab_result_status TO authenticated, service_role;
