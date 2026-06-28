import { DEFAULT_TENANT_ID, PRIMARY_B2B_HOSTS } from './constants';

function normalizeHost(host: string | null | undefined): string | null {
  if (!host?.trim()) return null;
  const trimmed = host.trim().toLowerCase();
  const withoutPort = trimmed.split(':')[0] ?? trimmed;
  return withoutPort || null;
}

function hostFromAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isPrimaryB2bHost(hostname: string): boolean {
  if (PRIMARY_B2B_HOSTS.has(hostname)) return true;

  const appHost = hostFromAppUrl();
  if (appHost && hostname === appHost) return true;

  const extraHosts = process.env.TENANT_B2B_HOSTS?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (extraHosts?.includes(hostname)) return true;

  return false;
}

/**
 * Resolve tenant slug from incoming Host header.
 * Unknown hosts fall back to the default B2B tenant until Sprint D satellite config loads.
 */
export function resolveTenantIdFromHost(host: string | null | undefined): string {
  const hostname = normalizeHost(host);
  if (!hostname) return DEFAULT_TENANT_ID;
  if (isPrimaryB2bHost(hostname)) return DEFAULT_TENANT_ID;
  return DEFAULT_TENANT_ID;
}
