import 'server-only';

import { buildDemoStockMap } from '../data/demoStock';
import {
  getCatalogEntries,
  getCatalogEntry,
  getLowestRetailPrice,
  getPurchasableVariants,
} from '../catalog';
import type {
  CatalogDetail,
  CatalogSummary,
  StorefrontProduct,
} from '../../features/storefront/types';
import { productDocSchema } from '../schemas/product';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

interface VariantOverride {
  stock: number;
  active: boolean;
  storefrontBadge: 'none' | 'new_batch';
  activeFrom: string | null;
  activeUntil: string | null;
}

function isVariantVisibleNow(override: VariantOverride | undefined, catalogActive: boolean): boolean {
  const active = override?.active ?? catalogActive;
  if (!active) return false;

  const now = Date.now();
  const activeFrom = override?.activeFrom;
  const activeUntil = override?.activeUntil;

  if (activeFrom) {
    const from = Date.parse(activeFrom);
    if (!Number.isNaN(from) && now < from) return false;
  }
  if (activeUntil) {
    const until = Date.parse(activeUntil);
    if (!Number.isNaN(until) && now > until) return false;
  }

  return true;
}

function parseProductDoc(id: string, data: unknown): StorefrontProduct | null {
  const parsed = productDocSchema.safeParse(data);
  if (!parsed.success) return null;

  const override: VariantOverride = {
    stock: parsed.data.stock,
    active: parsed.data.active,
    storefrontBadge: parsed.data.storefrontBadge ?? 'none',
    activeFrom: parsed.data.activeFrom ?? null,
    activeUntil: parsed.data.activeUntil ?? null,
  };

  if (!isVariantVisibleNow(override, true)) return null;

  const { name, tag, price, stock, desc, purity, category, catalogId } = parsed.data;
  return {
    id,
    slug: catalogId ?? id,
    name,
    tag,
    price,
    stock,
    desc,
    purity,
    category,
  };
}

async function getVariantOverrides(): Promise<Map<string, VariantOverride>> {
  const entries = getCatalogEntries();
  const demoStock = buildDemoStockMap(entries);
  const overrides = new Map<string, VariantOverride>();

  for (const [id, stock] of Object.entries(demoStock)) {
    overrides.set(id, {
      stock,
      active: true,
      storefrontBadge: 'none',
      activeFrom: null,
      activeUntil: null,
    });
  }

  if (!isAdminSdkConfigured()) {
    return overrides;
  }

  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('products').get();

    for (const doc of snapshot.docs) {
      const parsed = productDocSchema.safeParse(doc.data());
      if (parsed.success) {
        overrides.set(doc.id, {
          stock: parsed.data.stock,
          active: parsed.data.active,
          storefrontBadge: parsed.data.storefrontBadge ?? 'none',
          activeFrom: parsed.data.activeFrom ?? null,
          activeUntil: parsed.data.activeUntil ?? null,
        });
      }
    }

    return overrides;
  } catch (error) {
    console.error('[products] Variant overrides fetch failed — using demo stock', error);
    return overrides;
  }
}

function entryToSummary(
  entry: ReturnType<typeof getCatalogEntries>[number],
  overrides: Map<string, VariantOverride>
): CatalogSummary | null {
  const purchasable = getPurchasableVariants(entry);
  const visibleVariants = purchasable.filter((variant) =>
    isVariantVisibleNow(overrides.get(variant.id), true)
  );

  if (visibleVariants.length === 0) return null;

  const stocks = visibleVariants.map((variant) => overrides.get(variant.id)?.stock ?? 0);
  const totalStock = stocks.reduce((sum, value) => sum + value, 0);
  const hasNewBatch = visibleVariants.some(
    (variant) => overrides.get(variant.id)?.storefrontBadge === 'new_batch'
  );

  return {
    slug: entry.id,
    name: entry.name,
    category: entry.category,
    description: entry.description,
    researchAreas: entry.researchAreas,
    fromPrice: getLowestRetailPrice(entry),
    inStock: stocks.some((value) => value > 0),
    totalStock,
    variantCount: entry.variants.length,
    purchasableVariantCount: visibleVariants.length,
    storefrontBadge: hasNewBatch ? 'new_batch' : 'none',
  };
}

function entryToVariants(
  entry: ReturnType<typeof getCatalogEntries>[number],
  overrides: Map<string, VariantOverride>
): StorefrontProduct[] {
  return getPurchasableVariants(entry)
    .filter((variant) => isVariantVisibleNow(overrides.get(variant.id), true))
    .map((variant) => ({
      id: variant.id,
      slug: entry.id,
      name: entry.name,
      tag: variant.dose,
      price: variant.retailPrice ?? 0,
      stock: overrides.get(variant.id)?.stock ?? 0,
      desc: entry.description,
      purity: 'Research Grade',
      category: entry.category,
    }));
}

export async function getCatalogSummaries(): Promise<CatalogSummary[]> {
  const overrides = await getVariantOverrides();
  return getCatalogEntries()
    .map((entry) => entryToSummary(entry, overrides))
    .filter((entry): entry is CatalogSummary => entry != null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCatalogDetail(slug: string): Promise<CatalogDetail | null> {
  const entry = getCatalogEntry(slug);
  if (!entry) return null;

  const overrides = await getVariantOverrides();
  const variants = entryToVariants(entry, overrides);
  if (variants.length === 0) return null;

  return {
    entry: {
      slug: entry.id,
      name: entry.name,
      category: entry.category,
      description: entry.description,
      researchAreas: entry.researchAreas,
    },
    variants,
  };
}

/** @deprecated Prefer getCatalogSummaries — kept for API compatibility */
export async function getStorefrontProducts(): Promise<StorefrontProduct[]> {
  if (!isAdminSdkConfigured()) {
    console.warn('[products] Admin SDK not configured — using catalog demo inventory');
    const overrides = await getVariantOverrides();
    return getCatalogEntries().flatMap((entry) => entryToVariants(entry, overrides));
  }

  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('products').get();

    const products = snapshot.docs
      .map((doc) => parseProductDoc(doc.id, doc.data()))
      .filter((product): product is StorefrontProduct => product !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (products.length === 0) {
      console.warn('[products] No active products in Firestore — using catalog demo inventory');
      const overrides = await getVariantOverrides();
      return getCatalogEntries().flatMap((entry) => entryToVariants(entry, overrides));
    }

    return products;
  } catch (error) {
    console.error('[products] Firestore fetch failed — using catalog demo inventory', error);
    const overrides = await getVariantOverrides();
    return getCatalogEntries().flatMap((entry) => entryToVariants(entry, overrides));
  }
}

export async function getProductStockByIds(ids: string[]): Promise<Record<string, number>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const overrides = await getVariantOverrides();
  return Object.fromEntries(uniqueIds.map((id) => [id, overrides.get(id)?.stock ?? 0]));
}
