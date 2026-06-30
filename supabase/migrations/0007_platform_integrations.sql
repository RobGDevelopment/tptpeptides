-- =============================================================================
-- Migration: 0007_platform_integrations
-- Monorepo-wide Integration Hub — encrypted third-party credentials (app-layer)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enum: integration connection mode
-- ---------------------------------------------------------------------------
CREATE TYPE public.integration_mode AS ENUM (
  'disconnected',
  'sandbox',
  'live'
);

-- ---------------------------------------------------------------------------
-- Enum: integration category (registry grouping)
-- ---------------------------------------------------------------------------
CREATE TYPE public.integration_category AS ENUM (
  'fulfillment',
  'financial',
  'crm_comms',
  'compliance',
  'ops'
);

-- ---------------------------------------------------------------------------
-- Table: platform_integrations
-- ---------------------------------------------------------------------------
CREATE TABLE public.platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  category public.integration_category NOT NULL,
  mode public.integration_mode NOT NULL DEFAULT 'disconnected',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secrets_ciphertext_sandbox BYTEA,
  secrets_ciphertext_live BYTEA,
  encryption_key_version SMALLINT NOT NULL DEFAULT 1,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_test_error TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_integrations_slug_format_chk CHECK (
    slug ~ '^[a-z][a-z0-9_]{1,63}$'
  ),
  CONSTRAINT platform_integrations_last_test_status_chk CHECK (
    last_test_status IS NULL OR last_test_status IN ('success', 'failed')
  ),
  CONSTRAINT platform_integrations_encryption_key_version_positive_chk CHECK (
    encryption_key_version > 0
  )
);

COMMENT ON TABLE public.platform_integrations IS
  'Monorepo-wide third-party integration registry. Secrets stored as AES-256-GCM ciphertext; decrypt only via service_role server code.';

COMMENT ON COLUMN public.platform_integrations.public_config IS
  'Non-secret provider config (base URLs, merchant IDs, from-addresses).';

COMMENT ON COLUMN public.platform_integrations.secrets_ciphertext_sandbox IS
  'Encrypted IntegrationSecretPayload for sandbox mode (IV + auth tag + ciphertext).';

COMMENT ON COLUMN public.platform_integrations.secrets_ciphertext_live IS
  'Encrypted IntegrationSecretPayload for live mode (IV + auth tag + ciphertext).';

COMMENT ON COLUMN public.platform_integrations.encryption_key_version IS
  'Maps to INTEGRATIONS_MASTER_KEY version for rotation without re-encrypting all rows at once.';

CREATE UNIQUE INDEX platform_integrations_slug_uidx
  ON public.platform_integrations (slug);

CREATE INDEX platform_integrations_category_mode_idx
  ON public.platform_integrations (category, mode, is_enabled);

-- ---------------------------------------------------------------------------
-- Table: platform_integration_audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE public.platform_integration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.platform_integrations (id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_admin_uid TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_integration_audit_log_action_not_empty_chk CHECK (
    length(trim(action)) > 0
  )
);

COMMENT ON TABLE public.platform_integration_audit_log IS
  'Immutable audit trail for integration changes. Never stores decrypted secrets.';

CREATE INDEX platform_integration_audit_log_integration_created_idx
  ON public.platform_integration_audit_log (integration_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER platform_integrations_set_updated_at
  BEFORE UPDATE ON public.platform_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — service_role only (no anon/authenticated access)
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_integration_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_integrations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.platform_integration_audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY platform_integrations_service_role_all
  ON public.platform_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY platform_integration_audit_log_service_role_all
  ON public.platform_integration_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT ALL ON public.platform_integrations TO service_role;
GRANT ALL ON public.platform_integration_audit_log TO service_role;
GRANT USAGE ON TYPE public.integration_mode TO service_role;
GRANT USAGE ON TYPE public.integration_category TO service_role;

-- ---------------------------------------------------------------------------
-- Seed: registry rows (disconnected; credentials added via Integration Hub UI)
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_integrations (slug, category, mode, is_enabled)
VALUES
  ('openloop', 'fulfillment', 'disconnected', false),
  ('rupa_health', 'fulfillment', 'disconnected', false),
  ('fullscript', 'fulfillment', 'disconnected', false),
  ('nmi', 'financial', 'disconnected', false),
  ('two_accept', 'financial', 'disconnected', false),
  ('quickbooks_online', 'financial', 'disconnected', false),
  ('gohighlevel', 'crm_comms', 'disconnected', false),
  ('twilio', 'crm_comms', 'disconnected', false),
  ('resend', 'crm_comms', 'disconnected', false),
  ('persona', 'compliance', 'disconnected', false),
  ('slack', 'ops', 'disconnected', false);
