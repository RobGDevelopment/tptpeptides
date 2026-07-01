import 'server-only';

import { headers } from 'next/headers';
import { resolveTenantFromHost } from './resolveTenant.edge';
import { CLINIC_CANONICAL_SITE_URL } from './constants';
import { getClinicSiteUrlFromEnv, getB2bSiteUrl, normalizeSiteUrl } from './liveSites.edge';

export async function getRequestHostname(): Promise<string | null> {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  if (!host?.trim()) return null;
  return host.trim().toLowerCase().split(':')[0] ?? null;
}

export async function getRequestTenantLane(): Promise<'b2b' | 'telehealth'> {
  const hostname = await getRequestHostname();
  return resolveTenantFromHost(hostname).lane;
}

export async function getRequestSiteUrl(): Promise<string> {
  const lane = await getRequestTenantLane();
  if (lane === 'telehealth') {
    return normalizeSiteUrl(getClinicSiteUrlFromEnv() ?? CLINIC_CANONICAL_SITE_URL);
  }
  return getB2bSiteUrl();
}
