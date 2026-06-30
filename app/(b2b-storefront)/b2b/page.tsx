import { getCatalogSummaries } from '../../../lib/firebase/products.server';
import {
  getHomepageMerchandising,
  getSiteSettings,
  resolveFeaturedProducts,
} from '../../../lib/firebase/storefrontCms.server';
import { StorefrontPage } from '../../../features/storefront/components/StorefrontPage';
import { getTenantConfig } from '../../../lib/firebase/tenant.server';
import { getActiveTenantId } from '../../../lib/tenant/getTenant.server';
import { resolveTenantHeroHeadline } from '../../../lib/tenant/content';

export const revalidate = 3600;

export default async function Page() {
  const [catalog, settings, homepage, tenantId] = await Promise.all([
    getCatalogSummaries(),
    getSiteSettings(),
    getHomepageMerchandising(),
    getActiveTenantId(),
  ]);

  const tenantConfig = await getTenantConfig(tenantId);
  const heroTitle = resolveTenantHeroHeadline(tenantConfig, settings.heroTitle);

  const featured = resolveFeaturedProducts(catalog, homepage);

  return (
    <StorefrontPage
      catalog={catalog}
      featured={featured}
      settings={settings}
      homepage={homepage}
      heroTitle={heroTitle}
    />
  );
}
