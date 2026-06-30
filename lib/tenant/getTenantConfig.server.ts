import 'server-only';

import { DEFAULT_CLINIC_LANDING } from '../data/clinicLandingDefaults';
import { mergeClinicLandingContent } from '../schemas/clinicLanding';
import { tenantConfigSchema, type TenantConfig } from '../schemas/tenant';
import { CLINIC_TENANT_ID, PRIMARY_CLINIC_HOSTS } from './constants';
import { getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import { getTenantConfig } from '../firebase/tenant.server';

function getStaticClinicTenantConfig(): TenantConfig {
  const now = new Date().toISOString();
  return tenantConfigSchema.parse({
    slug: CLINIC_TENANT_ID,
    name: 'TPT Wellness Clinic',
    lane: 'telehealth',
    domains: [...PRIMARY_CLINIC_HOSTS],
    supportEmail: 'support@tptwellness.com',
    content: DEFAULT_CLINIC_LANDING,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}

/** Lane-aware tenant config — clinic loads Firebase when available. */
export async function getTenantConfigForRequest(tenantId: string): Promise<TenantConfig> {
  if (tenantId === CLINIC_TENANT_ID) {
    if (isAdminSdkConfigured()) {
      const snap = await getAdminFirestore()
        .collection('tenant_config')
        .doc(CLINIC_TENANT_ID)
        .get();

      if (snap.exists) {
        const parsed = tenantConfigSchema.safeParse(snap.data());
        if (parsed.success && parsed.data.lane === 'telehealth') {
          return parsed.data;
        }
      }
    }

    return getStaticClinicTenantConfig();
  }

  return getTenantConfig(tenantId);
}

export async function getClinicLandingForRequest(): Promise<ReturnType<typeof mergeClinicLandingContent>> {
  const config = await getTenantConfigForRequest(CLINIC_TENANT_ID);
  return mergeClinicLandingContent(config.content, DEFAULT_CLINIC_LANDING);
}
