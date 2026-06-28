import 'server-only';

import { algoliasearch } from 'algoliasearch';
import type { CatalogSummary } from '../../features/storefront/types';

export const DEFAULT_ALGOLIA_INDEX = 'tpt_catalog';

export function isAlgoliaConfigured(): boolean {
  return Boolean(
    process.env.ALGOLIA_APP_ID?.trim() && process.env.ALGOLIA_ADMIN_API_KEY?.trim()
  );
}

export function getAlgoliaIndexName(): string {
  return process.env.ALGOLIA_INDEX_NAME?.trim() || DEFAULT_ALGOLIA_INDEX;
}

function getAdminClient() {
  const appId = process.env.ALGOLIA_APP_ID?.trim();
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY?.trim();
  if (!appId || !apiKey) {
    throw new Error('Algolia is not configured');
  }
  return algoliasearch(appId, apiKey);
}

export interface AlgoliaCatalogRecord {
  objectID: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  researchAreas: string[];
  fromPrice: number | null;
  inStock: boolean;
}

export function catalogSummariesToAlgoliaRecords(products: CatalogSummary[]): AlgoliaCatalogRecord[] {
  return products.map((product) => ({
    objectID: product.slug,
    slug: product.slug,
    name: product.name,
    category: product.category,
    description: product.description,
    researchAreas: product.researchAreas,
    fromPrice: product.fromPrice,
    inStock: product.inStock,
  }));
}

export async function reindexCatalog(products: CatalogSummary[]): Promise<number> {
  const client = getAdminClient();
  const indexName = getAlgoliaIndexName();
  const records = catalogSummariesToAlgoliaRecords(products);

  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: ['name', 'description', 'researchAreas', 'category'],
      attributesForFaceting: ['filterOnly(category)', 'filterOnly(inStock)'],
    },
  });

  await client.replaceAllObjects({
    indexName,
    objects: records as unknown as Record<string, unknown>[],
  });

  return records.length;
}

export async function searchCatalog(query: string, limit = 24): Promise<AlgoliaCatalogRecord[]> {
  const client = getAdminClient();
  const indexName = getAlgoliaIndexName();
  const response = await client.searchSingleIndex<AlgoliaCatalogRecord>({
    indexName,
    searchParams: {
      query,
      hitsPerPage: limit,
    },
  });

  return response.hits;
}
