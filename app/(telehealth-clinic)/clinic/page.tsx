import { ClinicLandingPage } from '../../../features/clinic/components/ClinicLandingPage';
import { getClinicLandingForRequest } from '../../../lib/tenant/getTenantConfig.server';

export default async function ClinicLandingPageRoute() {
  const content = await getClinicLandingForRequest();

  return <ClinicLandingPage content={content} />;
}
