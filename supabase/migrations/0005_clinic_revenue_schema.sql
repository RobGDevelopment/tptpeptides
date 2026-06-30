-- =============================================================================
-- Migration: 0005_clinic_revenue_schema
-- Telehealth Clinic — gateway-agnostic pricing, promotions, subscriptions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enum: subscription lifecycle (processor-agnostic)
-- ---------------------------------------------------------------------------
CREATE TYPE public.clinic_subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused'
);

-- ---------------------------------------------------------------------------
-- Enum: supported high-risk / alternate payment gateways
-- ---------------------------------------------------------------------------
CREATE TYPE public.clinic_payment_gateway AS ENUM (
  'nmi',
  'authorizenet',
  '2accept',
  'seamlesschex',
  'payram',
  'stripe'
);

-- ---------------------------------------------------------------------------
-- Table: clinic_pricing_tiers
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC(10, 2) NOT NULL,
  gateway_plan_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_pricing_tiers_name_not_empty_chk CHECK (length(trim(name)) > 0),
  CONSTRAINT clinic_pricing_tiers_monthly_price_positive_chk CHECK (monthly_price > 0),
  CONSTRAINT clinic_pricing_tiers_gateway_plan_id_len_chk CHECK (
    gateway_plan_id IS NULL OR length(trim(gateway_plan_id)) > 0
  )
);

COMMENT ON TABLE public.clinic_pricing_tiers IS
  'Telehealth membership tiers. Public landing reads active tiers; gateway_plan_id wired at processor cutover.';

CREATE INDEX clinic_pricing_tiers_active_sort_idx
  ON public.clinic_pricing_tiers (is_active, sort_order, monthly_price);

CREATE UNIQUE INDEX clinic_pricing_tiers_gateway_plan_id_uidx
  ON public.clinic_pricing_tiers (gateway_plan_id)
  WHERE gateway_plan_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Table: clinic_promotions
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  discount_percentage NUMERIC(5, 2) NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_promotions_code_format_chk CHECK (
    code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'
  ),
  CONSTRAINT clinic_promotions_discount_range_chk CHECK (
    discount_percentage > 0 AND discount_percentage <= 100
  ),
  CONSTRAINT clinic_promotions_max_uses_positive_chk CHECK (
    max_uses IS NULL OR max_uses > 0
  ),
  CONSTRAINT clinic_promotions_current_uses_non_negative_chk CHECK (
    current_uses >= 0
  ),
  CONSTRAINT clinic_promotions_uses_within_max_chk CHECK (
    max_uses IS NULL OR current_uses <= max_uses
  )
);

COMMENT ON TABLE public.clinic_promotions IS
  'Promotional coupon codes for telehealth memberships. Admin-managed; validated at checkout.';

CREATE UNIQUE INDEX clinic_promotions_code_lower_uidx
  ON public.clinic_promotions (lower(code));

CREATE INDEX clinic_promotions_active_expires_idx
  ON public.clinic_promotions (is_active, expires_at);

-- ---------------------------------------------------------------------------
-- Table: clinic_subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE public.clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles (id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.clinic_pricing_tiers (id) ON DELETE RESTRICT,
  gateway_subscription_id TEXT,
  payment_gateway public.clinic_payment_gateway,
  status public.clinic_subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_subscriptions_gateway_subscription_id_len_chk CHECK (
    gateway_subscription_id IS NULL OR length(trim(gateway_subscription_id)) > 0
  )
);

COMMENT ON TABLE public.clinic_subscriptions IS
  'Patient membership subscriptions. Gateway IDs populated when billing goes live (NMI, 2Accept, etc.).';

CREATE INDEX clinic_subscriptions_patient_id_idx
  ON public.clinic_subscriptions (patient_id);

CREATE INDEX clinic_subscriptions_status_period_idx
  ON public.clinic_subscriptions (status, current_period_end DESC);

CREATE UNIQUE INDEX clinic_subscriptions_gateway_subscription_id_uidx
  ON public.clinic_subscriptions (gateway_subscription_id, payment_gateway)
  WHERE gateway_subscription_id IS NOT NULL AND payment_gateway IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER clinic_pricing_tiers_set_updated_at
  BEFORE UPDATE ON public.clinic_pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER clinic_promotions_set_updated_at
  BEFORE UPDATE ON public.clinic_promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER clinic_subscriptions_set_updated_at
  BEFORE UPDATE ON public.clinic_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.clinic_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinic_pricing_tiers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_promotions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_subscriptions FORCE ROW LEVEL SECURITY;

-- Active tiers: public + authenticated read (Transparent Pricing landing)
CREATE POLICY clinic_pricing_tiers_select_active_anon
  ON public.clinic_pricing_tiers
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY clinic_pricing_tiers_select_active_authenticated
  ON public.clinic_pricing_tiers
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Subscriptions: patients read own records only
CREATE POLICY clinic_subscriptions_select_own
  ON public.clinic_subscriptions
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Service role: full admin / webhook access
CREATE POLICY clinic_pricing_tiers_service_role_all
  ON public.clinic_pricing_tiers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY clinic_promotions_service_role_all
  ON public.clinic_promotions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY clinic_subscriptions_service_role_all
  ON public.clinic_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.clinic_pricing_tiers TO anon, authenticated;
GRANT SELECT ON public.clinic_subscriptions TO authenticated;
GRANT ALL ON public.clinic_pricing_tiers TO service_role;
GRANT ALL ON public.clinic_promotions TO service_role;
GRANT ALL ON public.clinic_subscriptions TO service_role;
GRANT USAGE ON TYPE public.clinic_subscription_status TO authenticated, service_role;
GRANT USAGE ON TYPE public.clinic_payment_gateway TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seed: default HNW-oriented tiers (gateway_plan_id null until processor cutover)
-- ---------------------------------------------------------------------------
INSERT INTO public.clinic_pricing_tiers (name, description, monthly_price, sort_order, is_active)
VALUES
  (
    'Essential Care',
    'Physician-led telehealth intake, quarterly labs review, and secure patient portal access.',
    299.00,
    10,
    true
  ),
  (
    'Executive Wellness',
    'Priority clinical review, personalized protocol adjustments, and dedicated care coordination.',
    599.00,
    20,
    true
  ),
  (
    'Concierge Longevity',
    'White-glove telehealth with expedited provider access, advanced biomarker tracking, and family office-ready reporting.',
    1199.00,
    30,
    true
  );
