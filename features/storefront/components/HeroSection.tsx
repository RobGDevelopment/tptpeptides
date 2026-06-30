import Link from 'next/link';
import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SITE_WORDMARK } from '../../../lib/brand';
import type { SiteSettings } from '../../../lib/schemas/storefrontCms';

interface HeroSectionProps {
  settings: SiteSettings;
  heroTitle?: string;
  heroBody?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  wordmark?: string;
  /** When false, hides B2B research trust badges (HPLC, etc.). */
  showTrustBadges?: boolean;
}

export function HeroSection({
  settings,
  heroTitle,
  heroBody,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  wordmark,
  showTrustBadges = true,
}: HeroSectionProps) {
  const headline = heroTitle ?? settings.heroTitle;
  const body = heroBody ?? settings.heroBody;
  const primaryLabel = primaryCtaLabel ?? settings.primaryCtaLabel;
  const primaryHref = primaryCtaHref ?? settings.primaryCtaHref;
  const secondaryLabel = secondaryCtaLabel ?? settings.secondaryCtaLabel;
  const secondaryHref = secondaryCtaHref ?? settings.secondaryCtaHref;
  const displayWordmark = wordmark ?? SITE_WORDMARK;

  return (
    <div className="relative pt-28 pb-20">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <PageHeader wordmark={displayWordmark} title={headline} />

        <p className="text-base md:text-lg text-secondary max-w-2xl mx-auto mt-10 font-light leading-relaxed text-center">
          {body}
        </p>

        <HeaderDividerBeam delay={1} className="mt-10" />

        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-12 mb-14">
          <Link href={primaryHref} className="terminal-link">
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className="terminal-link">
            {secondaryLabel}
          </Link>
        </div>

        {showTrustBadges ? (
          <div className="flex flex-wrap justify-center gap-8 md:gap-14 text-xs tracking-caps uppercase text-muted font-medium">
            <span className="flex items-center gap-2">
              <span className="text-gold">
                <Icons.Check />
              </span>
              HPLC Tested
            </span>
            <span className="flex items-center gap-2">
              <span className="text-gold">
                <Icons.Shield />
              </span>
              Research Grade
            </span>
            <span className="flex items-center gap-2">
              <span className="text-gold">
                <Icons.Box />
              </span>
              Cold Chain
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-8 md:gap-14 text-xs tracking-caps uppercase text-muted font-medium">
            <span className="flex items-center gap-2">
              <span className="text-gold">
                <Icons.Shield />
              </span>
              HIPAA Compliant
            </span>
            <span className="flex items-center gap-2">
              <span className="text-gold">
                <Icons.Check />
              </span>
              Board Certified
            </span>
            <span className="flex items-center gap-2">
              <span className="text-gold">
                <Icons.User />
              </span>
              Licensed Providers
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
