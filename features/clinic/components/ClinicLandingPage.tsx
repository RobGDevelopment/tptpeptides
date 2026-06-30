import type { ClinicLandingContent } from '../../../lib/schemas/clinicLanding';
import { ClinicExcellenceSection } from './ClinicExcellenceSection';
import { ClinicHeroSection } from './ClinicHeroSection';
import { ClinicProcessSection } from './ClinicProcessSection';
import { ClinicProvidersSection } from './ClinicProvidersSection';
import { ClinicTrustMarquee } from './ClinicTrustMarquee';

export function ClinicLandingPage({ content }: { content: ClinicLandingContent }) {
  return (
    <main>
      <ClinicHeroSection content={content} />
      <ClinicTrustMarquee />
      <ClinicExcellenceSection />
      <ClinicProcessSection />
      <ClinicProvidersSection />
    </main>
  );
}
