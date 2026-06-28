import 'server-only';

import { DEFAULT_TENANT_ID } from '../tenant/constants';
import { tenantConfigSchema, type TenantConfig } from '../schemas/tenant';
import { SITE_SUPPORT_EMAIL, SITE_NAME } from '../brand';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const COLLECTION = 'tenant_config';

function defaultTenantConfig(): TenantConfig {
  const now = new Date().toISOString();
  return tenantConfigSchema.parse({
    slug: DEFAULT_TENANT_ID,
    name: SITE_NAME,
    lane: 'b2b',
    domains: [
      'localhost',
      '127.0.0.1',
      'medfit-pro.vercel.app',
      'tptpeptides.com',
      'www.tptpeptides.com',
    ],
    supportEmail: SITE_SUPPORT_EMAIL,
    payment: {
      primaryProvider: 'stripe',
      useStripeUntilCutover: true,
      rail: 'b2b_card',
    },
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}

/** Loads tenant config; bootstraps the default B2B doc when missing. */
export async function getTenantConfig(tenantId: string = DEFAULT_TENANT_ID): Promise<TenantConfig> {
  if (!isAdminSdkConfigured()) {
    return defaultTenantConfig();
  }

  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(tenantId);
  const snap = await ref.get();

  if (!snap.exists) {
    if (tenantId === DEFAULT_TENANT_ID) {
      const bootstrap = defaultTenantConfig();
      await ref.set(bootstrap, { merge: true });
      return bootstrap;
    }
    return defaultTenantConfig();
  }

  const parsed = tenantConfigSchema.safeParse(snap.data());
  if (!parsed.success) {
    console.error('[tenant] Invalid tenant_config document', tenantId, parsed.error.flatten());
    return tenantId === DEFAULT_TENANT_ID ? defaultTenantConfig() : defaultTenantConfig();
  }

  return parsed.data;
}
