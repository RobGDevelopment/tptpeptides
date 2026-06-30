-- =============================================================================
-- Migration: 0002_prescriptions_schema
-- Telehealth Clinic — provider-issued prescriptions / treatment plans
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enum: prescription fulfillment status
-- ---------------------------------------------------------------------------
CREATE TYPE public.prescription_status AS ENUM (
  'pending_fulfillment',
  'active',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Table: prescriptions
-- Links an approved intake to a medication treatment plan
-- ---------------------------------------------------------------------------
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles (id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES public.medical_intakes (id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage_instructions TEXT NOT NULL,
  status public.prescription_status NOT NULL DEFAULT 'pending_fulfillment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prescriptions_medication_name_not_empty_chk CHECK (
    length(trim(medication_name)) > 0
  ),
  CONSTRAINT prescriptions_dosage_instructions_not_empty_chk CHECK (
    length(trim(dosage_instructions)) > 0
  )
);

COMMENT ON TABLE public.prescriptions IS
  'Provider-issued treatment plans routed to OpenLoop MSO or compounding pharmacy.';
COMMENT ON COLUMN public.prescriptions.intake_id IS
  'Source medical intake that was approved before prescribing.';
COMMENT ON COLUMN public.prescriptions.status IS
  'Fulfillment lifecycle: pending_fulfillment → active | cancelled.';

CREATE INDEX prescriptions_patient_id_idx
  ON public.prescriptions (patient_id);

CREATE INDEX prescriptions_intake_id_idx
  ON public.prescriptions (intake_id);

CREATE INDEX prescriptions_status_created_at_idx
  ON public.prescriptions (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER prescriptions_set_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS: prescriptions — patients can read their own scripts
-- ---------------------------------------------------------------------------
CREATE POLICY prescriptions_select_own
  ON public.prescriptions
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: service_role — full access (explicit; Supabase service key also bypasses RLS)
-- ---------------------------------------------------------------------------
CREATE POLICY prescriptions_service_role_all
  ON public.prescriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
GRANT USAGE ON TYPE public.prescription_status TO authenticated, service_role;
