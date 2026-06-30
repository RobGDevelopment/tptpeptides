-- =============================================================================
-- Migration: 0004_intake_sla
-- SLA alert deduplication for unreviewed medical intakes
-- =============================================================================

ALTER TABLE public.medical_intakes
  ADD COLUMN sla_alerted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.medical_intakes.sla_alerted_at IS
  'Timestamp when a provider SLA alert was sent for this intake (prevents duplicate notifications).';

CREATE INDEX medical_intakes_sla_queue_idx
  ON public.medical_intakes (status, submitted_at)
  WHERE status = 'submitted' AND sla_alerted_at IS NULL;
