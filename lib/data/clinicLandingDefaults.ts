import type { ClinicLandingContent } from '../schemas/clinicLanding';
import { CLINIC_THEME_DEFAULTS } from './clinicThemeDefaults';

export const DEFAULT_CLINIC_LANDING: ClinicLandingContent = {
  heroHeadline: 'Expert Medical Weight Loss & Wellness',
  heroBody: 'Board-certified providers. Evidence-based protocols.',
  primaryCtaLabel: 'Start Medical Intake',
  primaryCtaHref: '/intake',
  secondaryCtaLabel: 'My Care Dashboard',
  secondaryCtaHref: '/dashboard',
  footerTagline: 'Licensed telehealth care you can trust.',
  wordmark: 'TPT WELLNESS',
  heroImageUrl: undefined,
  heroImageAlt: 'Telehealth wellness care',
  logoUrl: undefined,
  navBrandName: 'TPT Wellness Clinic',
  heroImagePosition: 'right',
  primaryColor: CLINIC_THEME_DEFAULTS.primaryColor,
  accentColor: CLINIC_THEME_DEFAULTS.accentColor,
  backgroundColor: CLINIC_THEME_DEFAULTS.backgroundColor,
};
