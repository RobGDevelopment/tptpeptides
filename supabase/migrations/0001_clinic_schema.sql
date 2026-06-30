-- =============================================================================
-- Migration: 0001_clinic_schema
-- Telehealth Clinic (OpenLoop MSO / HIPAA) — air-gapped from Firebase B2B
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enum: medical intake workflow status
-- ---------------------------------------------------------------------------
CREATE TYPE public.medical_intake_status AS ENUM (
  'draft',
  'submitted',
  'in_review',
  'approved',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- Table: patient_profiles
-- One row per Supabase Auth user; PK mirrors auth.users.id
-- ---------------------------------------------------------------------------
CREATE TABLE public.patient_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  phone TEXT,
  shipping_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_profiles_phone_format_chk CHECK (
    phone IS NULL OR phone ~ '^\+?[0-9\s\-().]{7,20}$'
  ),
  CONSTRAINT patient_profiles_dob_past_chk CHECK (
    date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE
  ),
  CONSTRAINT patient_profiles_shipping_address_obj_chk CHECK (
    shipping_address IS NULL OR jsonb_typeof(shipping_address) = 'object'
  )
);

COMMENT ON TABLE public.patient_profiles IS
  'Clinic patient demographics and fulfillment address. PK = auth.users.id (ePHI).';
COMMENT ON COLUMN public.patient_profiles.shipping_address IS
  'JSON object: { line1, line2?, city, state, postal_code, country }';

CREATE INDEX patient_profiles_created_at_idx
  ON public.patient_profiles (created_at DESC);

CREATE INDEX patient_profiles_phone_idx
  ON public.patient_profiles (phone)
  WHERE phone IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Table: telehealth_consents
-- Append-only informed consent audit trail (OpenLoop MSO requirement)
-- ---------------------------------------------------------------------------
CREATE TABLE public.telehealth_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles (id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  CONSTRAINT telehealth_consents_version_not_empty_chk CHECK (
    length(trim(consent_version)) > 0
  ),
  CONSTRAINT telehealth_consents_user_agent_len_chk CHECK (
    user_agent IS NULL OR length(user_agent) <= 2048
  )
);

COMMENT ON TABLE public.telehealth_consents IS
  'Immutable informed-consent events. Never UPDATE/DELETE from patient-facing roles.';
COMMENT ON COLUMN public.telehealth_consents.consent_version IS
  'Semantic version or document hash of the consent PDF/HTML presented to the patient.';

CREATE INDEX telehealth_consents_patient_id_idx
  ON public.telehealth_consents (patient_id);

CREATE INDEX telehealth_consents_patient_version_idx
  ON public.telehealth_consents (patient_id, consent_version, agreed_at DESC);

CREATE INDEX telehealth_consents_agreed_at_idx
  ON public.telehealth_consents (agreed_at DESC);

-- ---------------------------------------------------------------------------
-- Table: medical_intakes
-- Async clinical questionnaire + provider review workflow
-- ---------------------------------------------------------------------------
CREATE TABLE public.medical_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles (id) ON DELETE CASCADE,
  status public.medical_intake_status NOT NULL DEFAULT 'draft',
  clinical_questionnaire JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_provider_id UUID,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT medical_intakes_questionnaire_obj_chk CHECK (
    jsonb_typeof(clinical_questionnaire) = 'object'
  ),
  CONSTRAINT medical_intakes_submitted_at_consistency_chk CHECK (
    (status = 'draft' AND submitted_at IS NULL)
    OR (status <> 'draft' AND submitted_at IS NOT NULL)
  )
);

COMMENT ON TABLE public.medical_intakes IS
  'Patient medical history intake. clinical_questionnaire stores flexible form schema responses.';
COMMENT ON COLUMN public.medical_intakes.clinical_questionnaire IS
  'JSON object keyed by form section, e.g. { allergies: [], medications: [], conditions: [] }.';
COMMENT ON COLUMN public.medical_intakes.assigned_provider_id IS
  'OpenLoop / MSO provider UUID. Populated by back-office service role after submission.';

CREATE INDEX medical_intakes_patient_id_idx
  ON public.medical_intakes (patient_id);

CREATE INDEX medical_intakes_status_submitted_at_idx
  ON public.medical_intakes (status, submitted_at DESC NULLS LAST);

CREATE INDEX medical_intakes_assigned_provider_idx
  ON public.medical_intakes (assigned_provider_id)
  WHERE assigned_provider_id IS NOT NULL;

CREATE INDEX medical_intakes_clinical_questionnaire_gin_idx
  ON public.medical_intakes USING gin (clinical_questionnaire);

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER patient_profiles_set_updated_at
  BEFORE UPDATE ON public.patient_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER medical_intakes_set_updated_at
  BEFORE UPDATE ON public.medical_intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: provision patient_profiles on Supabase Auth signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_clinic_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patient_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_clinic_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_clinic_user();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telehealth_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_intakes ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (defense in depth; service_role still bypasses)
ALTER TABLE public.patient_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.telehealth_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medical_intakes FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS: patient_profiles — authenticated patients own their row
-- ---------------------------------------------------------------------------
CREATE POLICY patient_profiles_select_own
  ON public.patient_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY patient_profiles_insert_own
  ON public.patient_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY patient_profiles_update_own
  ON public.patient_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: telehealth_consents — append-only for patients (SELECT + INSERT)
-- ---------------------------------------------------------------------------
CREATE POLICY telehealth_consents_select_own
  ON public.telehealth_consents
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY telehealth_consents_insert_own
  ON public.telehealth_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- No UPDATE/DELETE policies for authenticated — consent records are immutable

-- ---------------------------------------------------------------------------
-- RLS: medical_intakes — patients manage their own intakes
-- ---------------------------------------------------------------------------
CREATE POLICY medical_intakes_select_own
  ON public.medical_intakes
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY medical_intakes_insert_own
  ON public.medical_intakes
  FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY medical_intakes_update_own
  ON public.medical_intakes
  FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: service_role — full access (explicit; Supabase service key also bypasses RLS)
-- ---------------------------------------------------------------------------
CREATE POLICY patient_profiles_service_role_all
  ON public.patient_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY telehealth_consents_service_role_all
  ON public.telehealth_consents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY medical_intakes_service_role_all
  ON public.medical_intakes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.patient_profiles TO authenticated;
GRANT SELECT, INSERT ON public.telehealth_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.medical_intakes TO authenticated;
GRANT ALL ON public.patient_profiles TO service_role;
GRANT ALL ON public.telehealth_consents TO service_role;
GRANT ALL ON public.medical_intakes TO service_role;
GRANT USAGE ON TYPE public.medical_intake_status TO authenticated, service_role;
