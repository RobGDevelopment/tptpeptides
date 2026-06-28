import { ProductsPageContent } from '../../../features/admin/components/ProductsPageContent';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { showTierPricingPanel } from '../../../lib/modules/adminModuleLinks';

export default async function AdminProductsPage() {
  const flags = await getModuleFlags();
  const showTierPricing = showTierPricingPanel(flags);

  return <ProductsPageContent showTierPricing={showTierPricing} />;
}
