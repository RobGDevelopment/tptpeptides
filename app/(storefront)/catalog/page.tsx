import type { Metadata } from 'next';
import { SITE_NAME } from '../../../lib/brand';
import { getCatalogSummaries } from '../../../lib/firebase/products.server';
import { getCategoryMerchandising } from '../../../lib/firebase/storefrontCms.server';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import { CatalogGrid } from '../../../features/storefront/components/CatalogGrid';

export const metadata: Metadata = {
  title: 'Research Catalog',
  description:
    `Browse ${SITE_NAME} research peptides by category. HPLC-tested compounds for in-vitro laboratory use only.`,
};

export const revalidate = 3600;

export default async function CatalogIndexPage() {
  const flags = await getModuleFlags();
  const [catalog, categoryMerchandising] = await Promise.all([
    getCatalogSummaries(),
    getCategoryMerchandising(),
  ]);

  return (
    <main className="min-h-screen bg-void selection:bg-gold/20 pt-28">
      <CatalogGrid
        products={catalog}
        showFilters
        categoryMerchandising={categoryMerchandising}
        algoliaSearchEnabled={isModuleEnabled(flags, 'isAlgoliaSearchEnabled')}
        title="Full Research Catalog"
        subtitle="Every compound links to variant-level pricing, live inventory, and research area documentation."
      />
    </main>
  );
}

