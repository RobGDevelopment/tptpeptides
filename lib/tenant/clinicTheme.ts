import type { CSSProperties } from 'react';
import type { ClinicLandingContent } from '../schemas/clinicLanding';
import { CLINIC_THEME_DEFAULTS } from '../data/clinicThemeDefaults';
import { normalizeThemeHex } from './theme';

/** Inline theme for telehealth lane only — does not affect B2B html.dark. */
export function clinicLandingToCssProperties(content: ClinicLandingContent): CSSProperties {
  const primary =
    normalizeThemeHex(content.primaryColor) ?? CLINIC_THEME_DEFAULTS.primaryColor;
  const accent = normalizeThemeHex(content.accentColor) ?? CLINIC_THEME_DEFAULTS.accentColor;
  const background =
    normalizeThemeHex(content.backgroundColor) ?? CLINIC_THEME_DEFAULTS.backgroundColor;

  return {
    '--theme-primary': primary,
    '--theme-accent': accent,
    '--clinic-background': background,
    '--color-void': background,
  } as CSSProperties;
}
