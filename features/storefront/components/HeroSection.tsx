import Link from 'next/link';
import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SITE_WORDMARK } from '../../../lib/brand';
import type { SiteSettings } from '../../../lib/schemas/storefrontCms';

interface HeroSectionProps {
  settings: SiteSettings;
}

export function HeroSection({ settings }: HeroSectionProps) {
  return (
    <div className="relative pt-28 pb-20">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <PageHeader wordmark={SITE_WORDMARK} title={settings.heroTitle} />

        <p className="text-base md:text-lg text-secondary max-w-2xl mx-auto mt-10 font-light leading-relaxed text-center">
          {settings.heroBody}
        </p>

        <HeaderDividerBeam delay={1} className="mt-10" />

        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-12 mb-14">
          <Link href={settings.primaryCtaHref} className="terminal-link">
            {settings.primaryCtaLabel}
          </Link>
          <Link href={settings.secondaryCtaHref} className="terminal-link">
            {settings.secondaryCtaLabel}
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-8 md:gap-14 text-xs tracking-caps uppercase text-muted font-medium">
          <span className="flex items-center gap-2">
            <span className="text-gold"><Icons.Check /></span>
            HPLC Tested
          </span>
          <span className="flex items-center gap-2">
            <span className="text-gold"><Icons.Shield /></span>
            Research Grade
          </span>
          <span className="flex items-center gap-2">
            <span className="text-gold"><Icons.Box /></span>
            Cold Chain
          </span>
        </div>
      </div>
    </div>
  );
}

