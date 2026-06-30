import type { CSSProperties } from 'react';
import type { ClinicLandingContent } from '../schemas/clinicLanding';
import type { HeroMediaAspectRatio, HeroMediaType } from '../schemas/clinicLanding';

export type { HeroMediaAspectRatio, HeroMediaType };

const ASPECT_RATIO_PRESETS: HeroMediaAspectRatio[] = ['16:9', '9:16', '4:5', '3:4', '1:1'];

export function classifyAspectRatio(width: number, height: number): HeroMediaAspectRatio {
  if (width <= 0 || height <= 0) return 'auto';
  const ratio = width / height;

  for (const preset of ASPECT_RATIO_PRESETS) {
    const [w, h] = preset.split(':').map(Number);
    if (Math.abs(ratio - w / h) < 0.06) return preset;
  }

  return 'auto';
}

export function resolveHeroMediaUrl(content: ClinicLandingContent): string | undefined {
  return content.heroImageUrl;
}

export function resolveHeroMediaType(content: ClinicLandingContent): HeroMediaType {
  const url = content.heroImageUrl;
  if (url && inferMediaTypeFromUrl(url) === 'video') return 'video';
  if (content.heroMediaType) return content.heroMediaType;
  return 'image';
}

/** Align stored media metadata with the resolved URL (e.g. bundled /corp/*.mp4). */
export function normalizeClinicLandingHeroMedia(
  content: ClinicLandingContent,
  defaults: ClinicLandingContent
): ClinicLandingContent {
  const url = content.heroImageUrl?.trim() || defaults.heroImageUrl;
  if (!url) return content;

  const isVideo = inferMediaTypeFromUrl(url) === 'video';

  return {
    ...content,
    heroImageUrl: url,
    heroMediaType: isVideo ? 'video' : (content.heroMediaType ?? defaults.heroMediaType),
    heroMediaAspectRatio:
      content.heroMediaAspectRatio ??
      (isVideo && url === defaults.heroImageUrl ? defaults.heroMediaAspectRatio : 'auto'),
    heroMediaWidth: content.heroMediaWidth ?? (url === defaults.heroImageUrl ? defaults.heroMediaWidth : undefined),
    heroMediaHeight:
      content.heroMediaHeight ?? (url === defaults.heroImageUrl ? defaults.heroMediaHeight : undefined),
    heroVideoLoop: content.heroVideoLoop ?? defaults.heroVideoLoop,
    heroVideoMuted: content.heroVideoMuted ?? defaults.heroVideoMuted,
  };
}

export function resolveHeroFramePresentation(content: ClinicLandingContent): {
  className: string;
  style?: CSSProperties;
} {
  const preset = content.heroMediaAspectRatio ?? 'auto';

  const presetClasses: Record<Exclude<HeroMediaAspectRatio, 'auto'>, string> = {
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '4:5': 'aspect-[4/5]',
    '3:4': 'aspect-[3/4]',
    '1:1': 'aspect-square',
  };

  if (preset !== 'auto') {
    return { className: presetClasses[preset] };
  }

  const width = content.heroMediaWidth;
  const height = content.heroMediaHeight;
  if (width && height && width > 0 && height > 0) {
    return { className: '', style: { aspectRatio: `${width} / ${height}` } };
  }

  return { className: 'aspect-[4/5] sm:aspect-[5/6]' };
}

export function isHeroMediaLandscape(content: ClinicLandingContent): boolean {
  const preset = content.heroMediaAspectRatio ?? 'auto';
  if (preset === '16:9') return true;
  if (preset === '9:16' || preset === '4:5' || preset === '3:4') return false;
  if (preset === '1:1') return false;

  const width = content.heroMediaWidth;
  const height = content.heroMediaHeight;
  if (width && height) return width > height;
  return false;
}

export function formatHeroMediaDimensions(content: ClinicLandingContent): string | null {
  const width = content.heroMediaWidth;
  const height = content.heroMediaHeight;
  if (!width || !height) return null;
  return `${width}×${height}`;
}

export function inferMediaTypeFromUrl(url: string): HeroMediaType {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url) ? 'video' : 'image';
}
