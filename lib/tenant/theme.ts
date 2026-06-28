import type { CSSProperties } from 'react';
import type { TenantConfig, TenantTheme } from '../schemas/tenant';

/** Falconwood OS institutional defaults — B2B fallback when tenant theme is absent. */
export const FALCONWOOD_THEME_DEFAULTS = {
  primaryColor: 'oklch(0.72 0.07 88)',
  accentColor: 'oklch(0.82 0.05 92)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
} as const;

const HEX_COLOR = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

export function isValidThemeHex(value: string): boolean {
  return HEX_COLOR.test(value.trim());
}

export function normalizeThemeHex(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return isValidThemeHex(trimmed) ? trimmed : undefined;
}

export function mergeTenantTheme(theme?: TenantTheme | null): Required<
  Pick<TenantTheme, 'primaryColor' | 'accentColor'>
> & {
  logoUrl?: string;
  fontFamily: string;
} {
  return {
    primaryColor: theme?.primaryColor ?? FALCONWOOD_THEME_DEFAULTS.primaryColor,
    accentColor: theme?.accentColor ?? FALCONWOOD_THEME_DEFAULTS.accentColor,
    logoUrl: theme?.logoUrl?.trim() || undefined,
    fontFamily: theme?.fontFamily?.trim() || FALCONWOOD_THEME_DEFAULTS.fontFamily,
  };
}

/** Inline CSS custom properties for root layout injection. */
export function tenantThemeToCssProperties(config: TenantConfig): CSSProperties {
  const merged = mergeTenantTheme(config.theme);

  return {
    '--theme-primary': merged.primaryColor,
    '--theme-accent': merged.accentColor,
    '--theme-font-family': merged.fontFamily,
  } as CSSProperties;
}

export function sanitizeThemeInput(input: {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  fontFamily?: string;
}): TenantTheme | undefined {
  const primaryColor = normalizeThemeHex(input.primaryColor);
  const accentColor = normalizeThemeHex(input.accentColor);
  const logoUrl = input.logoUrl?.trim() || undefined;
  const fontFamily = input.fontFamily?.trim() || undefined;

  if (!primaryColor && !accentColor && !logoUrl && !fontFamily) {
    return undefined;
  }

  return {
    ...(primaryColor ? { primaryColor } : {}),
    ...(accentColor ? { accentColor } : {}),
    ...(logoUrl ? { logoUrl } : {}),
    ...(fontFamily ? { fontFamily } : {}),
  };
}
