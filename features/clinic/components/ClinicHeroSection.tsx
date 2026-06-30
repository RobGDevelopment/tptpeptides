import Link from 'next/link';
import Image from 'next/image';
import { Icons } from '../../../components/icons';
import { PageHeader } from '../../../components/ui/PageHeader';
import type { ClinicLandingContent } from '../../../lib/schemas/clinicLanding';

export function ClinicHeroSection({ content }: { content: ClinicLandingContent }) {
  return (
    <div className="relative pt-28 pb-20 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 clinic-hero-glow" aria-hidden />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <PageHeader
              wordmark={content.wordmark}
              title={content.heroHeadline}
              align="left"
            />

            <p className="text-base md:text-lg text-secondary max-w-xl mt-8 font-light leading-relaxed">
              {content.heroBody}
            </p>

            <div className="flex flex-wrap gap-x-8 gap-y-4 mt-10">
              <Link href={content.primaryCtaHref} className="clinic-cta-primary">
                {content.primaryCtaLabel}
              </Link>
              <Link href={content.secondaryCtaHref} className="clinic-cta-secondary">
                {content.secondaryCtaLabel}
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 md:gap-10 mt-12 text-xs tracking-caps uppercase text-muted font-medium">
              <span className="flex items-center gap-2">
                <span className="text-[var(--theme-primary)]">
                  <Icons.Shield />
                </span>
                HIPAA Compliant
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[var(--theme-primary)]">
                  <Icons.Check />
                </span>
                Board Certified
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[var(--theme-primary)]">
                  <Icons.User />
                </span>
                Licensed Providers
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            {content.heroImageUrl ? (
              <div className="relative aspect-[4/5] sm:aspect-[5/6] overflow-hidden rounded-sm border border-black/[0.06] shadow-[0_24px_60px_-30px_rgba(45,106,106,0.35)]">
                <Image
                  src={content.heroImageUrl}
                  alt={content.heroImageAlt ?? 'Wellness clinic'}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 42vw"
                />
              </div>
            ) : (
              <div className="relative aspect-[4/5] sm:aspect-[5/6] overflow-hidden rounded-sm border border-black/[0.06] clinic-hero-placeholder">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <span className="text-[var(--theme-primary)] opacity-70">
                    <Icons.Shield />
                  </span>
                  <p className="text-[10px] tracking-caps uppercase text-muted">
                    Upload a hero image in Clinic Settings
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
