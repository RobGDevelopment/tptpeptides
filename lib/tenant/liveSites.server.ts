import 'server-only';

import { getModuleFlags } from '../firebase/modules.server';
import { isModuleEnabled } from '../modules/flags';
import { getTenantConfigForRequest } from './getTenantConfig.server';
import {
  getB2bAdminBaseUrl,
  getB2bSiteUrl,
  getClinicSiteUrlFromEnv,
  getDefaultClinicProductionUrl,
  normalizeSiteUrl,
} from './liveSites.edge';
import { CLINIC_TENANT_ID } from './constants';

export type LiveSiteLink = {
  label: string;
  url: string;
  host: string;
  description: string;
};

export type LiveSitesSnapshot = {
  admin: LiveSiteLink;
  b2b: LiveSiteLink;
  clinic: LiveSiteLink | null;
  telehealthEnabled: boolean;
  clinicConfigured: boolean;
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] ?? url;
  }
}

function pickPublicClinicHost(domains: string[]): string | null {
  for (const domain of domains) {
    const host = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }
  return null;
}

async function resolveClinicSiteUrl(): Promise<string | null> {
  const fromEnv = getClinicSiteUrlFromEnv();
  if (fromEnv) return fromEnv;

  const config = await getTenantConfigForRequest(CLINIC_TENANT_ID);
  const host = pickPublicClinicHost(config.domains);
  if (host) return `https://${host}`;

  return getDefaultClinicProductionUrl();
}

export async function getLiveSitesSnapshot(): Promise<LiveSitesSnapshot> {
  const flags = await getModuleFlags();
  const telehealthEnabled = isModuleEnabled(flags, 'isTelehealthEnabled');

  const b2bUrl = normalizeSiteUrl(getB2bSiteUrl());
  const adminUrl = normalizeSiteUrl(getB2bAdminBaseUrl());
  const clinicUrl = telehealthEnabled ? await resolveClinicSiteUrl() : null;

  return {
    telehealthEnabled,
    clinicConfigured: Boolean(clinicUrl),
    admin: {
      label: 'Super Admin Back Office',
      url: `${adminUrl}/admin`,
      host: hostFromUrl(adminUrl),
      description: 'Catalog, orders, storefront CMS, and clinic operations.',
    },
    b2b: {
      label: 'B2B Storefront',
      url: b2bUrl,
      host: hostFromUrl(b2bUrl),
      description: 'Research procurement lane — catalog, checkout, and client portal.',
    },
    clinic: clinicUrl
      ? {
          label: 'Telehealth Clinic',
          url: clinicUrl,
          host: hostFromUrl(clinicUrl),
          description: 'Patient intake, dashboard, and TPT Clinic storefront.',
        }
      : null,
  };
}
