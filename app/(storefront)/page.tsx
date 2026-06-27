import { getCatalogSummaries } from '../../lib/firebase/products.server';
import {
  getHomepageMerchandising,
  getSiteSettings,
  resolveFeaturedProducts,
} from '../../lib/firebase/storefrontCms.server';
import { StorefrontPage } from '../../features/storefront/components/StorefrontPage';

export const revalidate = 60;

export default async function Page() {
  const [catalog, settings, homepage] = await Promise.all([
    getCatalogSummaries(),
    getSiteSettings(),
    getHomepageMerchandising(),
  ]);

  const featured = resolveFeaturedProducts(catalog, homepage);

  return (
    <StorefrontPage
      catalog={catalog}
      featured={featured}
      settings={settings}
      homepage={homepage}
    />
  );
}
