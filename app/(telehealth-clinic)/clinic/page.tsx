import { HeroSection } from '../../../features/storefront/components/HeroSection';
import type { SiteSettings } from '../../../lib/schemas/storefrontCms';
import { getClinicLandingForRequest } from '../../../lib/tenant/getTenantConfig.server';

function toSiteSettings(content: Awaited<ReturnType<typeof getClinicLandingForRequest>>): SiteSettings {
  return {
    heroTitle: content.heroHeadline,
    heroBody: content.heroBody,
    primaryCtaLabel: content.primaryCtaLabel,
    primaryCtaHref: content.primaryCtaHref,
    secondaryCtaLabel: content.secondaryCtaLabel,
    secondaryCtaHref: content.secondaryCtaHref,
    footerTagline: content.footerTagline,
  };
}

export default async function ClinicLandingPage() {
  const content = await getClinicLandingForRequest();
  const settings = toSiteSettings(content);

  return (
    <main>
      <HeroSection
        settings={settings}
        heroTitle={content.heroHeadline}
        heroBody={content.heroBody}
        primaryCtaLabel={content.primaryCtaLabel}
        primaryCtaHref={content.primaryCtaHref}
        secondaryCtaLabel={content.secondaryCtaLabel}
        secondaryCtaHref={content.secondaryCtaHref}
        wordmark={content.wordmark}
        showTrustBadges={false}
      />
    </main>
  );
}
