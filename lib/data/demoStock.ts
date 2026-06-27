import type { CatalogEntry } from '../schemas/catalog';

/** Demo stock levels when Firestore Admin SDK is not configured. */
export function buildDemoStockMap(entries: CatalogEntry[]): Record<string, number> {
  const stock: Record<string, number> = {};

  for (const entry of entries) {
    for (const variant of entry.variants) {
      if (variant.retailPrice == null || variant.retailPrice <= 0) continue;

      if (entry.id === 'semaglutide' && variant.dose === '2mg') {
        stock[variant.id] = 0;
        continue;
      }

      const seed = variant.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      stock[variant.id] = 15 + (seed % 120);
    }
  }

  return stock;
}
