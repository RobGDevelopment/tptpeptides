import { SITE_URL_VERCEL } from './brand';

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * Base URL for partner invite emails and password-reset continue links.
 * Never uses localhost — partners must land on the live Vercel preview.
 */
export function getInviteSiteUrl(override?: string): string {
  if (override?.trim()) {
    return override.trim().replace(/\/$/, '');
  }

  const inviteEnv = process.env.INVITE_SITE_URL?.trim();
  if (inviteEnv) {
    return inviteEnv.replace(/\/$/, '');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl && !/localhost|127\.0\.0\.1/i.test(appUrl)) {
    return appUrl.replace(/\/$/, '');
  }

  return SITE_URL_VERCEL;
}

export function inviteSiteHost(siteUrl?: string): string {
  try {
    return new URL(getInviteSiteUrl(siteUrl)).host;
  } catch {
    return new URL(SITE_URL_VERCEL).host;
  }
}
