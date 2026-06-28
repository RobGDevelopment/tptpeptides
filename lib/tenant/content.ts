import type { TenantConfig, TenantContent } from '../schemas/tenant';
import { SITE_SUPPORT_EMAIL } from '../brand';

/** Institutional default hero — CMS `heroTitle` remains the B2B fallback. */
export function resolveTenantHeroHeadline(
  config: TenantConfig,
  cmsHeroTitle: string
): string {
  const headline = config.content?.heroHeadline?.trim();
  return headline || cmsHeroTitle;
}

export function resolveTenantSupportEmail(config: TenantConfig): string {
  return (
    config.content?.supportEmail?.trim() ||
    config.supportEmail?.trim() ||
    SITE_SUPPORT_EMAIL
  );
}

/** Returns tenant ToS URL or default internal path `/terms`. */
export function resolveTenantTermsUrl(config: TenantConfig): string {
  const terms = config.content?.termsUrl?.trim();
  return terms || '/terms';
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function sanitizeTenantContentInput(input: {
  heroHeadline?: string;
  supportEmail?: string;
  termsUrl?: string;
}): TenantContent | undefined {
  const heroHeadline = input.heroHeadline?.trim() || undefined;
  const supportEmail = input.supportEmail?.trim() || undefined;
  const termsUrl = input.termsUrl?.trim() || undefined;

  if (!heroHeadline && !supportEmail && !termsUrl) {
    return undefined;
  }

  return {
    ...(heroHeadline ? { heroHeadline } : {}),
    ...(supportEmail ? { supportEmail } : {}),
    ...(termsUrl ? { termsUrl } : {}),
  };
}
