import {
  DEFAULT_TENANT_ID,
  CLINIC_TENANT_ID,
  PRIMARY_CLINIC_HOSTS,
  INTERNAL_B2B_PREFIX,
  INTERNAL_CLINIC_PREFIX,
} from './constants';

export type TenantResolution = {
  tenantId: string;
  lane: 'b2b' | 'telehealth';
  internalPrefix: typeof INTERNAL_B2B_PREFIX | typeof INTERNAL_CLINIC_PREFIX;
};

function normalizeHost(host: string | null | undefined): string | null {
  if (!host?.trim()) return null;
  const trimmed = host.trim().toLowerCase();
  const withoutPort = trimmed.split(':')[0] ?? trimmed;
  return withoutPort || null;
}

export function resolveTenantFromHost(host: string | null | undefined): TenantResolution {
  const hostname = normalizeHost(host);

  if (!hostname) {
    return { tenantId: DEFAULT_TENANT_ID, lane: 'b2b', internalPrefix: INTERNAL_B2B_PREFIX };
  }

  // Clinic Lane Resolution
  if (PRIMARY_CLINIC_HOSTS.has(hostname)) {
    return { tenantId: CLINIC_TENANT_ID, lane: 'telehealth', internalPrefix: INTERNAL_CLINIC_PREFIX };
  }

  const extraClinicHosts = process.env.TENANT_CLINIC_HOSTS?.split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (extraClinicHosts?.includes(hostname)) {
    return { tenantId: CLINIC_TENANT_ID, lane: 'telehealth', internalPrefix: INTERNAL_CLINIC_PREFIX };
  }

  // B2B Lane Resolution (Default Fallback)
  return { tenantId: DEFAULT_TENANT_ID, lane: 'b2b', internalPrefix: INTERNAL_B2B_PREFIX };
}

/** @deprecated Use resolveTenantFromHost for full lane + prefix resolution. */
export function resolveTenantIdFromHost(host: string | null | undefined): string {
  return resolveTenantFromHost(host).tenantId;
}
