import { ClinicHeroSection } from '../../../features/clinic/components/ClinicHeroSection';
import { getClinicLandingForRequest } from '../../../lib/tenant/getTenantConfig.server';

export default async function ClinicLandingPage() {
  const content = await getClinicLandingForRequest();

  return (
    <main>
      <ClinicHeroSection content={content} />
    </main>
  );
}
