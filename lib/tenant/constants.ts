/** Default B2B institutional tenant — zero-regression bootstrap for current deploy. */
export const DEFAULT_TENANT_ID = 'tpt-b2b';

export const DEFAULT_TENANT_SLUG = DEFAULT_TENANT_ID;

export const TENANT_ID_HEADER = 'x-tenant-id';

/** Hostnames that resolve to the primary B2B tenant (no port). */
export const PRIMARY_B2B_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'medfit-pro.vercel.app',
  'tptpeptides.com',
  'www.tptpeptides.com',
]);
