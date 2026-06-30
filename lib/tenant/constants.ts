export const DEFAULT_TENANT_ID = 'tpt-b2b';
export const CLINIC_TENANT_ID = 'tpt-clinic';

export const DEFAULT_TENANT_SLUG = DEFAULT_TENANT_ID;

export const PRIMARY_B2B_HOSTS = new Set([
  'tptpeptides.com',
  'www.tptpeptides.com',
  'localhost',
]);

export const PRIMARY_CLINIC_HOSTS = new Set([
  'tptwellness.com',
  'www.tptwellness.com',
  'tptclinic.com',
  'www.tptclinic.com',
  'medfit-clinic.vercel.app',
  'localhost',
  '127.0.0.1',
]);

/** Canonical public clinic URL (matches Vercel apex → www redirect). */
export const CLINIC_CANONICAL_SITE_URL = 'https://www.tptclinic.com';

/** Hosts merged into TENANT_CLINIC_HOSTS by setup:clinic-domain. */
export const CLINIC_ROUTING_HOSTS = [
  'medfit-clinic.vercel.app',
  'tptclinic.com',
  'www.tptclinic.com',
] as const;

export const INTERNAL_B2B_PREFIX = '/b2b';
export const INTERNAL_CLINIC_PREFIX = '/clinic';
export const TENANT_ID_HEADER = 'x-tenant-id';
