import type { ClinicLandingContent } from '../schemas/clinicLanding';
import { DEFAULT_CLINIC_HERO_VIDEO_PATH } from '../clinic/defaultHeroMedia';
import { CLINIC_BRAND_NAME } from '../tenant/constants';
import { CLINIC_THEME_DEFAULTS } from './clinicThemeDefaults';

export const DEFAULT_CLINIC_LANDING: ClinicLandingContent = {
  heroHeadline: 'Medical Weight Loss & Longevity Care',
  heroBody:
    'Concierge-level clinical oversight from board-certified physicians. Evidence-based protocols, discreet telehealth delivery, and outcomes you can measure.',
  primaryCtaLabel: 'Begin Private Intake',
  primaryCtaHref: '/intake',
  secondaryCtaLabel: 'Patient Portal',
  secondaryCtaHref: '/dashboard',
  footerTagline: 'Physician-led telehealth · HIPAA-secured · Licensed nationwide',
  wordmark: 'Physician-Led Telehealth',
  heroImageUrl: DEFAULT_CLINIC_HERO_VIDEO_PATH,
  heroImageAlt: `${CLINIC_BRAND_NAME} clinical excellence`,
  heroMediaType: 'video',
  heroMediaAspectRatio: '16:9',
  heroMediaWidth: 1920,
  heroMediaHeight: 1080,
  heroVideoPosterUrl: undefined,
  heroVideoLoop: true,
  heroVideoMuted: true,
  heroVideoLoopTrimStart: 0,
  heroVideoLoopTrimEnd: 0,
  logoUrl: undefined,
  navBrandName: CLINIC_BRAND_NAME,
  heroImagePosition: 'right',
  primaryColor: CLINIC_THEME_DEFAULTS.primaryColor,
  accentColor: CLINIC_THEME_DEFAULTS.accentColor,
  backgroundColor: CLINIC_THEME_DEFAULTS.backgroundColor,
};
