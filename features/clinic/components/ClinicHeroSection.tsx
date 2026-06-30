import Link from 'next/link';
import Image from 'next/image';
import { Icons } from '../../../components/icons';
import { PageHeader } from '../../../components/ui/PageHeader';
import { resolveNavBrandName } from '../../../lib/clinic/landingDisplay';
import type { ClinicLandingContent } from '../../../lib/schemas/clinicLanding';

type ClinicHeroSectionProps = {
  content: ClinicLandingContent;
  /** Admin live preview — disables navigation and uses native img for instant updates */
  preview?: boolean;
};

function PreviewCta({
  preview,
  href,
  className,
  children,
}: {
  preview: boolean;
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (preview) {
    return (
      <span className={className} aria-disabled>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function HeroImagePanel({ content, preview }: { content: ClinicLandingContent; preview: boolean }) {
  if (content.heroImageUrl) {
    return (
      <div className="relative aspect-[4/5] sm:aspect-[5/6] overflow-hidden rounded-sm border border-black/[0.06] shadow-[0_24px_60px_-30px_rgba(45,106,106,0.35)]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.heroImageUrl}
            alt={content.heroImageAlt ?? 'Wellness clinic'}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={content.heroImageUrl}
            alt={content.heroImageAlt ?? 'Wellness clinic'}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 90vw, 42vw"
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] sm:aspect-[5/6] overflow-hidden rounded-sm border border-black/[0.06] clinic-hero-placeholder">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="text-[var(--theme-primary)] opacity-70">
          <Icons.Shield />
        </span>
        <p className="text-[10px] tracking-caps uppercase text-muted">
          {preview ? 'Hero image appears here' : 'Upload a hero image in Clinic Settings'}
        </p>
      </div>
    </div>
  );
}

export function ClinicHeroSection({ content, preview = false }: ClinicHeroSectionProps) {
  const imageOnLeft = content.heroImagePosition === 'left';

  const copyColumn = (
    <div className={`${preview ? 'text-left' : 'text-center lg:text-left'}`}>
      <PageHeader wordmark={content.wordmark} title={content.heroHeadline} align="left" compact={preview} />

      <p
        className={`text-secondary max-w-xl font-light leading-relaxed ${
          preview ? 'text-sm mt-4' : 'text-base md:text-lg mt-8'
        }`}
      >
        {content.heroBody}
      </p>

      <div className={`flex flex-wrap gap-x-6 gap-y-3 ${preview ? 'mt-6' : 'mt-10'}`}>
        <PreviewCta preview={preview} href={content.primaryCtaHref} className="clinic-cta-primary">
          {content.primaryCtaLabel}
        </PreviewCta>
        <PreviewCta preview={preview} href={content.secondaryCtaHref} className="clinic-cta-secondary">
          {content.secondaryCtaLabel}
        </PreviewCta>
      </div>

      <div
        className={`flex flex-wrap gap-4 text-[10px] tracking-caps uppercase text-muted font-medium ${
          preview ? 'mt-6' : 'mt-12 gap-6 md:gap-10'
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="text-[var(--theme-primary)]">
            <Icons.Shield />
          </span>
          HIPAA
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
          Licensed
        </span>
      </div>
    </div>
  );

  const imageColumn = (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <HeroImagePanel content={content} preview={preview} />
    </div>
  );

  return (
    <div className={`relative overflow-hidden ${preview ? 'pt-4 pb-6' : 'pt-28 pb-20'}`}>
      <div className="pointer-events-none absolute inset-0 clinic-hero-glow" aria-hidden />
      <div className={`relative z-10 ${preview ? 'px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        <div
          className={`grid grid-cols-1 gap-8 items-center ${
            preview ? '' : 'lg:grid-cols-2 lg:gap-16'
          }`}
        >
          {imageOnLeft ? (
            <>
              {imageColumn}
              {copyColumn}
            </>
          ) : (
            <>
              {copyColumn}
              {imageColumn}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ClinicNavbarPreview({
  content,
  compact = false,
}: {
  content: ClinicLandingContent;
  compact?: boolean;
}) {
  const brandName = resolveNavBrandName(content);

  return (
    <header
      className={`border-b border-black/[0.06] bg-void/90 backdrop-blur-md ${
        compact ? 'px-3' : 'px-4'
      }`}
    >
      <div className={`flex items-center justify-between ${compact ? 'h-12' : 'h-14'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {content.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.logoUrl} alt="" className="h-6 w-auto max-w-[80px] object-contain shrink-0" />
          ) : (
            <span className="text-[var(--theme-primary)] shrink-0">
              <Icons.Shield />
            </span>
          )}
          <span className="text-[10px] tracking-title uppercase metallic-gold truncate">{brandName}</span>
        </div>
        <div className="hidden sm:flex gap-4 text-[9px] tracking-caps uppercase text-muted">
          <span>Home</span>
          <span className="text-[var(--theme-primary)]">Intake</span>
        </div>
      </div>
    </header>
  );
}

export function ClinicFooterPreview({
  content,
  supportEmail = 'support@tptwellness.com',
  compact = false,
}: {
  content: ClinicLandingContent;
  supportEmail?: string;
  compact?: boolean;
}) {
  return (
    <footer className={`border-t border-black/[0.06] bg-void ${compact ? 'px-3 py-4' : 'px-4 py-6'}`}>
      <p className="text-[9px] tracking-caps uppercase text-muted text-center mb-2">
        {content.footerTagline}
      </p>
      <p className="text-[9px] tracking-caps uppercase text-muted text-center">
        Support: <span className="text-secondary">{supportEmail}</span>
      </p>
    </footer>
  );
}
