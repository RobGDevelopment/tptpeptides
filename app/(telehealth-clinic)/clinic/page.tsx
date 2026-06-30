import { ClinicLandingPage } from '../../../features/clinic/components/ClinicLandingPage';
import { getActivePricingTiers } from '../../../lib/clinic/pricing.server';
import { getClinicLandingForRequest } from '../../../lib/tenant/getTenantConfig.server';

export default async function ClinicLandingPageRoute() {
  const [content, pricingTiers] = await Promise.all([
    getClinicLandingForRequest(),
    getActivePricingTiers(),
  ]);

  return <ClinicLandingPage content={content} pricingTiers={pricingTiers} />;
}
