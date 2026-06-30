import type { ClinicPricingTier } from '../../../lib/schemas/clinicRevenue';
import type { ClinicLandingContent } from '../../../lib/schemas/clinicLanding';
import { ClinicExcellenceSection } from './ClinicExcellenceSection';
import { ClinicHeroSection } from './ClinicHeroSection';
import { ClinicPricingSection } from './ClinicPricingSection';
import { ClinicProcessSection } from './ClinicProcessSection';
import { ClinicProvidersSection } from './ClinicProvidersSection';
import { ClinicTrustMarquee } from './ClinicTrustMarquee';

type ClinicLandingPageProps = {
  content: ClinicLandingContent;
  pricingTiers?: ClinicPricingTier[];
};

export function ClinicLandingPage({ content, pricingTiers = [] }: ClinicLandingPageProps) {
  return (
    <main>
      <ClinicHeroSection content={content} />
      <ClinicTrustMarquee />
      <ClinicExcellenceSection />
      <ClinicPricingSection tiers={pricingTiers} />
      <ClinicProcessSection />
      <ClinicProvidersSection />
    </main>
  );
}
