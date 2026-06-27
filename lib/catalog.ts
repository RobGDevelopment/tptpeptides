import 'server-only';

import catalogData from './data/catalog.json';
import { catalogFileSchema, type CatalogEntry } from './schemas/catalog';

export function getCatalogEntries(): CatalogEntry[] {
  return catalogFileSchema.parse(catalogData);
}

export function getCatalogEntry(slug: string): CatalogEntry | undefined {
  return getCatalogEntries().find((entry) => entry.id === slug);
}

export function getCatalogCategories(): string[] {
  const categories = new Set(getCatalogEntries().map((entry) => entry.category));
  return [...categories].sort((a, b) => a.localeCompare(b));
}

export function getPurchasableVariants(entry: CatalogEntry) {
  return entry.variants.filter((variant) => variant.retailPrice != null && variant.retailPrice > 0);
}

export function getLowestRetailPrice(entry: CatalogEntry): number | null {
  const prices = getPurchasableVariants(entry)
    .map((variant) => variant.retailPrice)
    .filter((price): price is number => price != null && price > 0);

  if (prices.length === 0) return null;
  return Math.min(...prices);
}
