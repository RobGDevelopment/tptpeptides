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
  'localhost',
  '127.0.0.1',
]);

export const INTERNAL_B2B_PREFIX = '/b2b';
export const INTERNAL_CLINIC_PREFIX = '/clinic';
export const TENANT_ID_HEADER = 'x-tenant-id';
