import type { InstitutionTier } from '../schemas/user';

/** Default tier discounts when Firestore `priceLists/{tier}` is missing. */
export const DEFAULT_TIER_DISCOUNTS: Record<InstitutionTier, number> = {
  Bronze: 0,
  Silver: 0.08,
  Gold: 0.15,
};

export function buildDefaultPriceLists(): Record<
  InstitutionTier,
  { tier: InstitutionTier; discountPercent: number; productOverrides: Record<string, number> }
> {
  return {
    Bronze: { tier: 'Bronze', discountPercent: DEFAULT_TIER_DISCOUNTS.Bronze, productOverrides: {} },
    Silver: { tier: 'Silver', discountPercent: DEFAULT_TIER_DISCOUNTS.Silver, productOverrides: {} },
    Gold: { tier: 'Gold', discountPercent: DEFAULT_TIER_DISCOUNTS.Gold, productOverrides: {} },
  };
}
