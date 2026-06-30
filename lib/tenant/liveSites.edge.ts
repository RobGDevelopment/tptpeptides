import { SITE_URL_PRODUCTION, SITE_URL_VERCEL } from '../brand';
import { PRIMARY_CLINIC_HOSTS } from './constants';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function hostFromValue(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      return new URL(trimmed).host.toLowerCase();
    } catch {
      return trimmed.split('/')[0] ?? trimmed;
    }
  }
  return trimmed.split('/')[0] ?? trimmed;
}

function isPublicHost(host: string): boolean {
  return Boolean(host) && !LOCAL_HOSTS.has(host);
}

export function getB2bSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_B2B_SITE_URL?.trim();
  if (explicit) return normalizeSiteUrl(explicit);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return normalizeSiteUrl(appUrl);

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }

  return SITE_URL_VERCEL;
}

export function getClinicSiteUrlFromEnv(): string | null {
  const explicit = process.env.NEXT_PUBLIC_CLINIC_SITE_URL?.trim();
  if (explicit) return normalizeSiteUrl(explicit);

  const envHosts = process.env.TENANT_CLINIC_HOSTS?.split(',')
    .map((host) => hostFromValue(host))
    .filter(isPublicHost);

  const primaryHost = [...PRIMARY_CLINIC_HOSTS].map((host) => host.toLowerCase()).find(isPublicHost);

  const host = envHosts?.[0] ?? primaryHost;
  return host ? `https://${host}` : null;
}

export function getB2bAdminBaseUrl(): string {
  return getB2bSiteUrl();
}

export function getDefaultClinicProductionUrl(): string {
  return SITE_URL_PRODUCTION.replace('tptpeptides.com', 'tptwellness.com');
}
