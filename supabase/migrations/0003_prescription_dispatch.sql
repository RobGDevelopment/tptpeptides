-- =============================================================================
-- Migration: 0003_prescription_dispatch
-- OpenLoop / compounding pharmacy outbound dispatch tracking
-- =============================================================================

CREATE TYPE public.prescription_dispatch_status AS ENUM (
  'pending',
  'sent',
  'confirmed',
  'failed'
);

ALTER TABLE public.prescriptions
  ADD COLUMN dispatch_status public.prescription_dispatch_status NOT NULL DEFAULT 'pending',
  ADD COLUMN external_rx_id TEXT,
  ADD COLUMN dispatched_at TIMESTAMPTZ,
  ADD COLUMN dispatch_error JSONB,
  ADD COLUMN dispatch_attempts INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.prescriptions.dispatch_status IS
  'Outbound fulfillment dispatch lifecycle to OpenLoop MSO / compounding partner.';
COMMENT ON COLUMN public.prescriptions.external_rx_id IS
  'Partner-assigned prescription or order identifier returned by the REST API.';
COMMENT ON COLUMN public.prescriptions.dispatch_error IS
  'Last dispatch failure payload for admin retry diagnostics.';

CREATE INDEX prescriptions_dispatch_status_idx
  ON public.prescriptions (dispatch_status, created_at DESC);

GRANT USAGE ON TYPE public.prescription_dispatch_status TO authenticated, service_role;
