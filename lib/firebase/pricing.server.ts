import 'server-only';

import { unstable_cache } from 'next/cache';
import { DEFAULT_TIER_DISCOUNTS } from '../data/priceListDefaults';
import { priceListDocSchema, type PriceListDoc } from '../schemas/priceList';
import type { InstitutionTier } from '../schemas/user';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const COLLECTION = 'priceLists';

async function readPriceList(tier: InstitutionTier): Promise<PriceListDoc> {
  const fallback: PriceListDoc = {
    tier,
    discountPercent: DEFAULT_TIER_DISCOUNTS[tier],
    productOverrides: {},
  };

  if (!isAdminSdkConfigured()) {
    return fallback;
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection(COLLECTION).doc(tier.toLowerCase()).get();
    if (!snap.exists) return fallback;

    const parsed = priceListDocSchema.safeParse(snap.data());
    return parsed.success ? parsed.data : fallback;
  } catch (error) {
    console.error('[pricing] Failed to read price list', tier, error);
    return fallback;
  }
}

const getCachedPriceList = (tier: InstitutionTier) =>
  unstable_cache(() => readPriceList(tier), [`price-list-${tier}`], {
    revalidate: 120,
    tags: [`price-list-${tier}`],
  })();

export async function getPriceListForTier(tier: InstitutionTier): Promise<PriceListDoc> {
  return getCachedPriceList(tier);
}

export async function listPriceLists(): Promise<PriceListDoc[]> {
  const tiers: InstitutionTier[] = ['Bronze', 'Silver', 'Gold'];
  return Promise.all(tiers.map((tier) => getPriceListForTier(tier)));
}

export async function writePriceList(
  patch: Pick<PriceListDoc, 'tier'> & Partial<Omit<PriceListDoc, 'tier'>>,
  updatedBy: string
): Promise<PriceListDoc> {
  const db = getAdminFirestore();
  const current = await readPriceList(patch.tier);
  const next: PriceListDoc = {
    ...current,
    ...patch,
    productOverrides: patch.productOverrides ?? current.productOverrides,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  const validated = priceListDocSchema.parse(next);
  await db.collection(COLLECTION).doc(patch.tier.toLowerCase()).set(validated, { merge: true });
  return validated;
}

export function resolveTierUnitPrice(
  productId: string,
  catalogPrice: number,
  priceList: PriceListDoc
): number {
  const override = priceList.productOverrides[productId];
  if (override != null && override > 0) {
    return Math.round(override * 100) / 100;
  }

  const discounted = catalogPrice * (1 - priceList.discountPercent);
  return Math.round(Math.max(discounted, 0.01) * 100) / 100;
}

export async function getUserPricingTier(userId: string): Promise<{
  institutionVerified: boolean;
  tier: InstitutionTier | null;
}> {
  if (!isAdminSdkConfigured()) {
    return { institutionVerified: false, tier: null };
  }

  const db = getAdminFirestore();
  const snap = await db.collection('users').doc(userId).get();
  if (!snap.exists) {
    return { institutionVerified: false, tier: null };
  }

  const data = snap.data()!;
  const institutionVerified = data.institutionVerified === true;
  const tier = institutionVerified
    ? ((data.institutionTier as InstitutionTier | undefined) ?? 'Bronze')
    : null;

  return { institutionVerified, tier };
}
