-- =============================================================================
-- Migration: 0010_clinic_financial_ledger
-- Telehealth Clinic — NMI clearing ledger, settlement batches, QBO sync queue
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enum: inbound payment / processor events
-- ---------------------------------------------------------------------------
CREATE TYPE public.clinic_payment_event_type AS ENUM (
  'subscription_charge',
  'subscription_refund',
  'merchant_fee',
  'chargeback',
  'settlement_transfer',
  'rolling_reserve_hold',
  'rolling_reserve_release'
);

-- ---------------------------------------------------------------------------
-- Enum: clinic chart-of-accounts (clearing methodology)
-- ---------------------------------------------------------------------------
CREATE TYPE public.clinic_ledger_account AS ENUM (
  'nmi_clearing',
  'operating_cash',
  'subscription_revenue',
  'merchant_fees',
  'chargebacks',
  'rolling_reserve'
);

CREATE TYPE public.clinic_ledger_line_type AS ENUM ('debit', 'credit');

CREATE TYPE public.clinic_qbo_sync_status AS ENUM (
  'pending',
  'processing',
  'synced',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Table: clinic_payment_events
-- Idempotent processor event ingest (webhook / batch import)
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  event_type public.clinic_payment_event_type NOT NULL,
  payment_gateway public.clinic_payment_gateway NOT NULL DEFAULT 'nmi',
  gateway_transaction_id TEXT,
  gateway_batch_id TEXT,
  subscription_id UUID REFERENCES public.clinic_subscriptions (id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patient_profiles (id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  accounting_period TEXT NOT NULL,
  entry_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_payment_events_idempotency_key_len_chk CHECK (
    length(trim(idempotency_key)) > 0
  ),
  CONSTRAINT clinic_payment_events_amount_nonzero_chk CHECK (amount_cents <> 0),
  CONSTRAINT clinic_payment_events_currency_upper_chk CHECK (
    currency = upper(currency)
  ),
  CONSTRAINT clinic_payment_events_accounting_period_fmt_chk CHECK (
    accounting_period ~ '^\d{4}-\d{2}$'
  )
);

COMMENT ON TABLE public.clinic_payment_events IS
  'Immutable processor events for clinic membership billing. Idempotent on idempotency_key.';

CREATE UNIQUE INDEX clinic_payment_events_idempotency_key_uidx
  ON public.clinic_payment_events (idempotency_key);

CREATE INDEX clinic_payment_events_gateway_tx_idx
  ON public.clinic_payment_events (payment_gateway, gateway_transaction_id)
  WHERE gateway_transaction_id IS NOT NULL;

CREATE INDEX clinic_payment_events_entry_group_idx
  ON public.clinic_payment_events (entry_group_id);

CREATE INDEX clinic_payment_events_period_idx
  ON public.clinic_payment_events (accounting_period DESC, created_at DESC);

-- ---------------------------------------------------------------------------
-- Table: clinic_ledger_entries
-- Double-entry lines tied to a payment event group
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_group_id UUID NOT NULL,
  payment_event_id UUID NOT NULL REFERENCES public.clinic_payment_events (id) ON DELETE CASCADE,
  account public.clinic_ledger_account NOT NULL,
  line_type public.clinic_ledger_line_type NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  memo TEXT,
  accounting_period TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_ledger_entries_amount_positive_chk CHECK (amount_cents > 0),
  CONSTRAINT clinic_ledger_entries_currency_upper_chk CHECK (
    currency = upper(currency)
  ),
  CONSTRAINT clinic_ledger_entries_accounting_period_fmt_chk CHECK (
    accounting_period ~ '^\d{4}-\d{2}$'
  )
);

COMMENT ON TABLE public.clinic_ledger_entries IS
  'Append-only double-entry lines for clinic NMI clearing ledger.';

CREATE INDEX clinic_ledger_entries_group_idx
  ON public.clinic_ledger_entries (entry_group_id, created_at);

CREATE INDEX clinic_ledger_entries_payment_event_idx
  ON public.clinic_ledger_entries (payment_event_id);

CREATE INDEX clinic_ledger_entries_account_period_idx
  ON public.clinic_ledger_entries (account, accounting_period);

-- ---------------------------------------------------------------------------
-- Table: clinic_settlement_batches
-- Processor batch settlements (net deposit + reserve withholdings)
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_batch_id TEXT NOT NULL,
  payment_gateway public.clinic_payment_gateway NOT NULL DEFAULT 'nmi',
  gross_amount_cents BIGINT NOT NULL DEFAULT 0,
  fee_amount_cents BIGINT NOT NULL DEFAULT 0,
  net_amount_cents BIGINT NOT NULL DEFAULT 0,
  reserve_amount_cents BIGINT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  settled_at TIMESTAMPTZ NOT NULL,
  payment_event_id UUID REFERENCES public.clinic_payment_events (id) ON DELETE SET NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_settlement_batches_gateway_batch_id_len_chk CHECK (
    length(trim(gateway_batch_id)) > 0
  ),
  CONSTRAINT clinic_settlement_batches_amounts_non_negative_chk CHECK (
    gross_amount_cents >= 0
    AND fee_amount_cents >= 0
    AND net_amount_cents >= 0
    AND reserve_amount_cents >= 0
  ),
  CONSTRAINT clinic_settlement_batches_currency_upper_chk CHECK (
    currency = upper(currency)
  )
);

COMMENT ON TABLE public.clinic_settlement_batches IS
  'NMI / high-risk processor batch settlement records for clearing-account reconciliation.';

CREATE UNIQUE INDEX clinic_settlement_batches_gateway_batch_uidx
  ON public.clinic_settlement_batches (payment_gateway, gateway_batch_id);

CREATE INDEX clinic_settlement_batches_settled_at_idx
  ON public.clinic_settlement_batches (settled_at DESC);

-- ---------------------------------------------------------------------------
-- Table: clinic_qbo_sync_queue
-- Async QuickBooks Online journal export queue
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_qbo_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_group_id UUID NOT NULL,
  payment_event_id UUID REFERENCES public.clinic_payment_events (id) ON DELETE SET NULL,
  status public.clinic_qbo_sync_status NOT NULL DEFAULT 'pending',
  qbo_journal_id TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_qbo_sync_queue_attempts_non_negative_chk CHECK (attempts >= 0),
  CONSTRAINT clinic_qbo_sync_queue_error_message_len_chk CHECK (
    error_message IS NULL OR length(error_message) <= 4000
  )
);

COMMENT ON TABLE public.clinic_qbo_sync_queue IS
  'Outbound QBO journal sync jobs for clinic clearing ledger entry groups.';

CREATE UNIQUE INDEX clinic_qbo_sync_queue_entry_group_uidx
  ON public.clinic_qbo_sync_queue (entry_group_id);

CREATE INDEX clinic_qbo_sync_queue_status_next_attempt_idx
  ON public.clinic_qbo_sync_queue (status, next_attempt_at);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER clinic_settlement_batches_set_updated_at
  BEFORE UPDATE ON public.clinic_settlement_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER clinic_qbo_sync_queue_set_updated_at
  BEFORE UPDATE ON public.clinic_qbo_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — service_role only (strict clinic financial data)
-- ---------------------------------------------------------------------------
ALTER TABLE public.clinic_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settlement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_qbo_sync_queue ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinic_payment_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_ledger_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settlement_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_qbo_sync_queue FORCE ROW LEVEL SECURITY;

CREATE POLICY clinic_payment_events_service_role_all
  ON public.clinic_payment_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY clinic_ledger_entries_service_role_all
  ON public.clinic_ledger_entries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY clinic_settlement_batches_service_role_all
  ON public.clinic_settlement_batches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY clinic_qbo_sync_queue_service_role_all
  ON public.clinic_qbo_sync_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT ALL ON public.clinic_payment_events TO service_role;
GRANT ALL ON public.clinic_ledger_entries TO service_role;
GRANT ALL ON public.clinic_settlement_batches TO service_role;
GRANT ALL ON public.clinic_qbo_sync_queue TO service_role;

GRANT USAGE ON TYPE public.clinic_payment_event_type TO service_role;
GRANT USAGE ON TYPE public.clinic_ledger_account TO service_role;
GRANT USAGE ON TYPE public.clinic_ledger_line_type TO service_role;
GRANT USAGE ON TYPE public.clinic_qbo_sync_status TO service_role;
