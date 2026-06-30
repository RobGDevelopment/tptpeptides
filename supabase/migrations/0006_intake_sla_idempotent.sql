-- =============================================================================
-- Migration: 0006_intake_sla_idempotent
-- SLA alert deduplication for unreviewed medical intakes (safe re-run)
-- =============================================================================

ALTER TABLE public.medical_intakes
  ADD COLUMN IF NOT EXISTS sla_alerted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.medical_intakes.sla_alerted_at IS
  'Timestamp when a provider SLA alert was sent for this intake (prevents duplicate notifications).';

CREATE INDEX IF NOT EXISTS medical_intakes_sla_queue_idx
  ON public.medical_intakes (status, submitted_at)
  WHERE status = 'submitted' AND sla_alerted_at IS NULL;
