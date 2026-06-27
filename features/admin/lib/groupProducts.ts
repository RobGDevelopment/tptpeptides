import type { AdminProductGroup, AdminProductVariant } from '../types';

interface FirestoreProductDoc {
  id: string;
  name?: string;
  tag?: string;
  price?: number;
  baseCost?: number | null;
  stock?: number;
  desc?: string;
  category?: string;
  catalogId?: string;
  variantId?: string;
  researchAreas?: string[];
  active?: boolean;
  reorderThreshold?: number;
  storefrontBadge?: 'none' | 'new_batch';
  activeFrom?: string | null;
  activeUntil?: string | null;
}

export function groupProductsFromDocs(docs: FirestoreProductDoc[]): AdminProductGroup[] {
  const groups = new Map<string, AdminProductGroup>();

  for (const doc of docs) {
    const catalogId = doc.catalogId ?? doc.id;
    const variant: AdminProductVariant = {
      id: doc.id,
      tag: doc.tag ?? '—',
      price: Number(doc.price ?? 0),
      baseCost: doc.baseCost ?? null,
      stock: Number(doc.stock ?? 0),
      active: doc.active ?? true,
      reorderThreshold: Number(doc.reorderThreshold ?? 20),
      storefrontBadge: doc.storefrontBadge ?? 'none',
      activeFrom: doc.activeFrom ?? null,
      activeUntil: doc.activeUntil ?? null,
    };

    const existing = groups.get(catalogId);
    if (existing) {
      existing.variants.push(variant);
      continue;
    }

    groups.set(catalogId, {
      catalogId,
      name: doc.name ?? 'Unknown',
      category: doc.category ?? 'Uncategorized',
      desc: doc.desc ?? '',
      researchAreas: doc.researchAreas ?? [],
      variants: [variant],
    });
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getGroupBaseCostRange(group: AdminProductGroup): string {
  const costs = group.variants
    .map((v) => v.baseCost)
    .filter((c): c is number => c != null && c > 0);

  if (costs.length === 0) return '—';
  const min = Math.min(...costs);
  const max = Math.max(...costs);
  return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
}

export function getGroupRetailRange(group: AdminProductGroup): string {
  const prices = group.variants.map((v) => v.price).filter((p) => p > 0);
  if (prices.length === 0) return '—';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
}

export function getGroupTotalStock(group: AdminProductGroup): number {
  return group.variants.reduce((sum, v) => sum + v.stock, 0);
}
