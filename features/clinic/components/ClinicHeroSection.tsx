import Link from 'next/link';
import Image from 'next/image';
import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { CLINIC_BRAND_NAME, CLINIC_SUPPORT_EMAIL } from '../../../lib/tenant/constants';
import { ClinicHeroLoopVideo } from './ClinicHeroLoopVideo';
import {
  isHeroMediaLandscape,
  resolveHeroFramePresentation,
  resolveHeroMediaType,
  resolveHeroMediaUrl,
} from '../../../lib/clinic/heroMedia';
import { resolveNavBrandName } from '../../../lib/clinic/landingDisplay';
import type { ClinicLandingContent } from '../../../lib/schemas/clinicLanding';

type ClinicHeroSectionProps = {
  content: ClinicLandingContent;
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

function HeroMediaPanel({ content, preview }: { content: ClinicLandingContent; preview: boolean }) {
  const mediaUrl = resolveHeroMediaUrl(content);
  const mediaType = resolveHeroMediaType(content);
  const frame = resolveHeroFramePresentation(content);
  const isVideo = mediaType === 'video';

  if (mediaUrl) {
    return (
      <div className={isVideo && !preview ? 'clinic-hero-cinematic-wrap' : ''}>
        <div
          className={`relative overflow-hidden clinic-hero-media ${
            isVideo
              ? 'clinic-hero-cinematic clinic-hero-video-matte'
              : 'rounded-sm border border-black/[0.06] shadow-[0_24px_60px_-30px_rgba(45,106,106,0.35)]'
          } ${frame.className}`}
          style={frame.style}
        >
          {isVideo ? (
            <ClinicHeroLoopVideo
              src={mediaUrl}
              poster={content.heroVideoPosterUrl}
              muted={content.heroVideoMuted ?? true}
              label={content.heroImageAlt ?? 'Clinical excellence'}
              loopTrimStart={content.heroVideoLoopTrimStart ?? 0}
              loopTrimEnd={content.heroVideoLoopTrimEnd ?? 0}
              className="clinic-hero-cinematic-video"
            />
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt={content.heroImageAlt ?? `${CLINIC_BRAND_NAME} care`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={content.heroImageAlt ?? `${CLINIC_BRAND_NAME} care`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 90vw, 50vw"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-sm border border-black/[0.06] clinic-hero-placeholder ${frame.className}`}
      style={frame.style}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="text-[var(--theme-accent)] opacity-70">
          <Icons.Shield />
        </span>
        <p className="text-[10px] tracking-caps uppercase text-muted">
          {preview ? 'Hero media appears here' : 'Upload hero media in Clinic Settings'}
        </p>
      </div>
    </div>
  );
}

export function ClinicHeroSection({ content, preview = false }: ClinicHeroSectionProps) {
  const imageOnLeft = content.heroImagePosition === 'left';
  const landscapeMedia = isHeroMediaLandscape(content);

  const copyColumn = (
    <div className={`${preview ? 'text-left' : 'text-center lg:text-left clinic-hero-copy'}`}>
      <p className="clinic-hero-eyebrow">{content.wordmark}</p>
      <HeaderDividerBeam delay={0} className={preview ? 'mt-3 mb-4' : 'mt-4 mb-6 max-w-[120px]'} />

      <h1
        className={`font-light tracking-title text-heading uppercase ${
          preview ? 'text-xl leading-tight' : 'text-4xl sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]'
        }`}
      >
        {content.heroHeadline}
      </h1>

      <p
        className={`text-secondary max-w-xl font-light leading-relaxed ${
          preview ? 'text-sm mt-4' : 'text-base md:text-lg mt-8'
        }`}
      >
        {content.heroBody}
      </p>

      <div className={`flex flex-wrap gap-3 ${preview ? 'mt-6' : 'mt-10'}`}>
        <PreviewCta preview={preview} href={content.primaryCtaHref} className="clinic-cta-primary clinic-cta-luxe">
          {content.primaryCtaLabel}
        </PreviewCta>
        <PreviewCta preview={preview} href={content.secondaryCtaHref} className="clinic-cta-secondary clinic-cta-luxe">
          {content.secondaryCtaLabel}
        </PreviewCta>
      </div>

      {!preview ? (
        <div className="hidden lg:flex flex-wrap gap-3 mt-10">
          {['HIPAA Secured', 'Board Certified', 'Physician-Led'].map((badge) => (
            <span key={badge} className="clinic-hero-badge">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  const mediaColumn = (
    <div className={`relative mx-auto w-full ${landscapeMedia ? 'max-w-none' : 'max-w-lg lg:max-w-none'}`}>
      <HeroMediaPanel content={content} preview={preview} />
    </div>
  );

  return (
    <div className={`relative overflow-hidden clinic-hero-shell ${preview ? 'pt-4 pb-6' : 'pt-28 pb-16 lg:pb-24'}`}>
      <div className="pointer-events-none absolute inset-0 clinic-hero-glow" aria-hidden />
      <div className="pointer-events-none absolute inset-0 clinic-hero-grain" aria-hidden />
      <div className={`relative z-10 ${preview ? 'px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        <div
          className={`grid grid-cols-1 gap-10 lg:gap-14 items-center ${
            preview
              ? ''
              : landscapeMedia
                ? 'lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'
                : 'lg:grid-cols-2'
          }`}
        >
          {imageOnLeft ? (
            <>
              {mediaColumn}
              {copyColumn}
            </>
          ) : (
            <>
              {copyColumn}
              {mediaColumn}
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
            <span className="text-[var(--theme-accent)] shrink-0">
              <Icons.Shield />
            </span>
          )}
          <span className="text-[10px] tracking-title uppercase metallic-gold truncate">{brandName}</span>
        </div>
        <div className="hidden sm:flex gap-4 text-[9px] tracking-caps uppercase text-muted">
          <span>Home</span>
          <span className="text-[var(--theme-accent)]">Intake</span>
        </div>
      </div>
    </header>
  );
}

export function ClinicFooterPreview({
  content,
  supportEmail = CLINIC_SUPPORT_EMAIL,
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
