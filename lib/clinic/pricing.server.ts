import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { ClinicPricingTier } from '../schemas/clinicRevenue';

type SupabasePricingTierRow = {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number | string;
  gateway_plan_id: string | null;
  is_active: boolean;
  sort_order: number;
};

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

export async function getActivePricingTiers(): Promise<ClinicPricingTier[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return [];
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from('clinic_pricing_tiers')
      .select('id, name, description, monthly_price, gateway_plan_id, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('monthly_price', { ascending: true });

    if (error) {
      console.error('[clinic-pricing] Failed to load active tiers:', error.message);
      return [];
    }

    return (data ?? []).map((row) => mapPricingTier(row as SupabasePricingTierRow));
  } catch (caught) {
    console.error(
      '[clinic-pricing] Unexpected error loading tiers:',
      caught instanceof Error ? caught.message : caught
    );
    return [];
  }
}
