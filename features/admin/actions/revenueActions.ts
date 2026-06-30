'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { DEFAULT_CLINIC_LANDING } from '../../../lib/data/clinicLandingDefaults';
import { CLINIC_THEME_DEFAULTS } from '../../../lib/data/clinicThemeDefaults';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../lib/firebase/admin';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import {
  createPromotionSchema,
  pricingTierUpdateSchema,
  type ClinicPricingTier,
  type ClinicPromotion,
  type CreatePromotionInput,
  type PricingTierUpdateInput,
  type RevenueMetrics,
} from '../../../lib/schemas/clinicRevenue';
import {
  DEFAULT_TELEHEALTH_BILLING_STRATEGY,
  telehealthBillingStrategySchema,
  type TelehealthBillingStrategy,
} from '../../../lib/schemas/telehealthBilling';
import { tenantConfigSchema, type TenantConfig } from '../../../lib/schemas/tenant';
import { CLINIC_TENANT_ID, CLINIC_BRAND_NAME, CLINIC_SUPPORT_EMAIL, PRIMARY_CLINIC_HOSTS } from '../../../lib/tenant/constants';
import { createAdminClient } from '../../../lib/supabase/admin';

const WELLNESS_MARKETING_PATH = '/admin/wellness/marketing';

type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

type SupabasePricingTierRow = {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number | string;
  gateway_plan_id: string | null;
  is_active: boolean;
  sort_order: number;
};

type SupabasePromotionRow = {
  id: string;
  code: string;
  discount_percentage: number | string;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

type SupabaseSubscriptionMetricRow = {
  status: string;
  tier_id: string;
  clinic_pricing_tiers:
    | { monthly_price: number | string }
    | { monthly_price: number | string }[]
    | null;
};

async function assertWellnessAdminAccess(): Promise<void> {
  const headersList = await headers();
  const request = new Request('http://internal/admin/wellness/marketing', {
    headers: headersList,
  });

  await requireAdminSession(request);

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    throw new AdminAuthError('Wellness module is not enabled.', 403);
  }
}

function clinicTenantBootstrap(): TenantConfig {
  const now = new Date().toISOString();
  return tenantConfigSchema.parse({
    slug: CLINIC_TENANT_ID,
    name: CLINIC_BRAND_NAME,
    lane: 'telehealth',
    domains: [...PRIMARY_CLINIC_HOSTS],
    supportEmail: CLINIC_SUPPORT_EMAIL,
    telehealthBillingStrategy: DEFAULT_TELEHEALTH_BILLING_STRATEGY,
    content: DEFAULT_CLINIC_LANDING,
    theme: {
      primaryColor: CLINIC_THEME_DEFAULTS.primaryColor,
      accentColor: CLINIC_THEME_DEFAULTS.accentColor,
    },
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}

async function loadClinicTenantConfig(): Promise<TenantConfig> {
  if (!isAdminSdkConfigured()) {
    return clinicTenantBootstrap();
  }

  const snap = await getAdminFirestore().collection('tenant_config').doc(CLINIC_TENANT_ID).get();
  if (!snap.exists) {
    return clinicTenantBootstrap();
  }

  const parsed = tenantConfigSchema.safeParse(snap.data());
  if (!parsed.success || parsed.data.lane !== 'telehealth') {
    return clinicTenantBootstrap();
  }

  return parsed.data;
}

function mapPricingTier(row: SupabasePricingTierRow): ClinicPricingTier {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    monthlyPrice: Number(row.monthly_price),
    gatewayPlanId: row.gateway_plan_id,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function mapPromotion(row: SupabasePromotionRow): ClinicPromotion {
  return {
    id: row.id,
    code: row.code,
    discountPercentage: Number(row.discount_percentage),
    maxUses: row.max_uses,
    currentUses: row.current_uses,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function resolveTierPrice(
  tier: SupabaseSubscriptionMetricRow['clinic_pricing_tiers']
): number {
  if (!tier) return 0;
  const row = Array.isArray(tier) ? tier[0] : tier;
  return row ? Number(row.monthly_price) : 0;
}

export async function getPricingTiers(): Promise<ClinicPricingTier[]> {
  await assertWellnessAdminAccess();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('clinic_pricing_tiers')
    .select('id, name, description, monthly_price, gateway_plan_id, is_active, sort_order')
    .order('sort_order', { ascending: true })
    .order('monthly_price', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPricingTier(row as SupabasePricingTierRow));
}

export async function getPromotions(): Promise<ClinicPromotion[]> {
  await assertWellnessAdminAccess();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('clinic_promotions')
    .select(
      'id, code, discount_percentage, max_uses, current_uses, expires_at, is_active, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPromotion(row as SupabasePromotionRow));
}

export async function updatePricingTier(
  input: PricingTierUpdateInput
): Promise<ActionResult<{ tier: ClinicPricingTier }>> {
  try {
    await assertWellnessAdminAccess();
    const parsed = pricingTierUpdateSchema.parse(input);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('clinic_pricing_tiers')
      .update({
        name: parsed.name,
        description: parsed.description ?? null,
        monthly_price: parsed.monthlyPrice,
        gateway_plan_id: parsed.gatewayPlanId?.trim() || null,
        is_active: parsed.isActive,
        ...(parsed.sortOrder !== undefined ? { sort_order: parsed.sortOrder } : {}),
      })
      .eq('id', parsed.id)
      .select('id, name, description, monthly_price, gateway_plan_id, is_active, sort_order')
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath(WELLNESS_MARKETING_PATH);
    revalidatePath('/clinic');

    return { ok: true, data: { tier: mapPricingTier(data as SupabasePricingTierRow) } };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unable to update pricing tier.';
    return { ok: false, error: message };
  }
}

export async function createPromotionCode(
  input: CreatePromotionInput
): Promise<ActionResult<{ promotion: ClinicPromotion }>> {
  try {
    await assertWellnessAdminAccess();
    const parsed = createPromotionSchema.parse(input);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('clinic_promotions')
      .insert({
        code: parsed.code,
        discount_percentage: parsed.discountPercentage,
        max_uses: parsed.maxUses ?? null,
        expires_at: parsed.expiresAt ?? null,
        is_active: true,
      })
      .select(
        'id, code, discount_percentage, max_uses, current_uses, expires_at, is_active, created_at'
      )
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath(WELLNESS_MARKETING_PATH);

    return {
      ok: true,
      data: { promotion: mapPromotion(data as SupabasePromotionRow) },
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unable to create promotion code.';
    return { ok: false, error: message };
  }
}

export async function togglePromotionStatus(
  promotionId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await assertWellnessAdminAccess();

    if (!promotionId) {
      return { ok: false, error: 'Promotion id is required.' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('clinic_promotions')
      .update({ is_active: isActive })
      .eq('id', promotionId);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath(WELLNESS_MARKETING_PATH);
    return { ok: true };
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : 'Unable to update promotion status.';
    return { ok: false, error: message };
  }
}

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  await assertWellnessAdminAccess();

  const supabase = createAdminClient();

  const [subscriptionsResult, promotionsResult] = await Promise.all([
    supabase
      .from('clinic_subscriptions')
      .select('status, tier_id, clinic_pricing_tiers ( monthly_price )')
      .in('status', ['active', 'trialing']),
    supabase
      .from('clinic_promotions')
      .select('current_uses, is_active, expires_at'),
  ]);

  if (subscriptionsResult.error) {
    throw new Error(subscriptionsResult.error.message);
  }

  if (promotionsResult.error) {
    throw new Error(promotionsResult.error.message);
  }

  const subscriptions = (subscriptionsResult.data ?? []) as SupabaseSubscriptionMetricRow[];
  let activeSubscriptions = 0;
  let trialingSubscriptions = 0;
  let estimatedMrr = 0;

  for (const subscription of subscriptions) {
    const monthlyPrice = resolveTierPrice(subscription.clinic_pricing_tiers);
    if (subscription.status === 'active') {
      activeSubscriptions += 1;
      estimatedMrr += monthlyPrice;
    } else if (subscription.status === 'trialing') {
      trialingSubscriptions += 1;
    }
  }

  const promotions = promotionsResult.data ?? [];
  let activePromotions = 0;
  let totalPromotionRedemptions = 0;

  for (const promotion of promotions) {
    totalPromotionRedemptions += promotion.current_uses ?? 0;
    const notExpired =
      !promotion.expires_at || new Date(promotion.expires_at).getTime() > Date.now();
    if (promotion.is_active && notExpired) {
      activePromotions += 1;
    }
  }

  return {
    activeSubscriptions,
    trialingSubscriptions,
    estimatedMrr,
    activePromotions,
    totalPromotionRedemptions,
  };
}

export async function getTelehealthBillingStrategy(): Promise<TelehealthBillingStrategy> {
  await assertWellnessAdminAccess();
  const config = await loadClinicTenantConfig();
  return config.telehealthBillingStrategy ?? DEFAULT_TELEHEALTH_BILLING_STRATEGY;
}

export async function updateTelehealthBillingStrategy(
  strategy: TelehealthBillingStrategy
): Promise<ActionResult<{ strategy: TelehealthBillingStrategy }>> {
  try {
    await assertWellnessAdminAccess();
    const parsed = telehealthBillingStrategySchema.parse(strategy);

    if (!isAdminSdkConfigured()) {
      return {
        ok: false,
        error: 'Firebase Admin SDK is not configured. Cannot save billing strategy.',
      };
    }

    const config = await loadClinicTenantConfig();
    const ref = getAdminFirestore().collection('tenant_config').doc(CLINIC_TENANT_ID);
    const updatedAt = new Date().toISOString();

    await ref.set(
      {
        ...config,
        telehealthBillingStrategy: parsed,
        updatedAt,
      },
      { merge: true }
    );

    revalidatePath(WELLNESS_MARKETING_PATH);

    return { ok: true, data: { strategy: parsed } };
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : 'Unable to update billing strategy.';
    return { ok: false, error: message };
  }
}
