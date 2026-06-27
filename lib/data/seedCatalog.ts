import { catalogFileSchema, type CatalogEntry } from '../schemas/catalog';
import { productDocSchema } from '../schemas/product';
import catalogData from './catalog.json';

const DEFAULT_MARGIN = 2.5;
const DEFAULT_REORDER_THRESHOLD = 20;

export interface SeedProductDoc {
  id: string;
  data: ReturnType<typeof productDocSchema.parse>;
}

function resolveRetailPrice(retailPrice: number | null, baseCost: number | null): number {
  if (retailPrice != null && retailPrice > 0) return retailPrice;
  if (baseCost != null && baseCost > 0) {
    return Math.round(baseCost * DEFAULT_MARGIN * 100) / 100;
  }
  return 1;
}

export function parseCatalogFile(raw: unknown): CatalogEntry[] {
  return catalogFileSchema.parse(raw);
}

export function catalogEntriesToProductDocs(entries: CatalogEntry[]): SeedProductDoc[] {
  const docs: SeedProductDoc[] = [];

  for (const entry of entries) {
    for (const variant of entry.variants) {
      const price = resolveRetailPrice(variant.retailPrice, variant.baseCost);
      const active = variant.retailPrice != null && variant.retailPrice > 0;

      const data = productDocSchema.parse({
        name: entry.name,
        tag: variant.dose,
        price,
        baseCost: variant.baseCost,
        stock: 0,
        desc: entry.description,
        purity: 'Research Grade',
        category: entry.category,
        catalogId: entry.id,
        variantId: variant.id,
        researchAreas: entry.researchAreas,
        active,
        reorderThreshold: DEFAULT_REORDER_THRESHOLD,
        supplierId: 'default-supplier',
      });

      docs.push({ id: variant.id, data });
    }
  }

  return docs;
}

export function getCatalogSeedProducts(): SeedProductDoc[] {
  const entries = parseCatalogFile(catalogData);
  return catalogEntriesToProductDocs(entries);
}
