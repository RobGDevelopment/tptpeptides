'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../lib/firebase/admin';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import { clinicDomainSchema, type AddCustomDomainResult } from '../../../lib/schemas/clinicDomain';
import { DEFAULT_CLINIC_LANDING } from '../../../lib/data/clinicLandingDefaults';
import { CLINIC_THEME_DEFAULTS } from '../../../lib/data/clinicThemeDefaults';
import { tenantConfigSchema, type TenantConfig } from '../../../lib/schemas/tenant';
import { CLINIC_TENANT_ID, PRIMARY_CLINIC_HOSTS } from '../../../lib/tenant/constants';
import { addProjectDomain, isVercelDomainsConfigured } from '../../../lib/vercel/domains.server';

const WELLNESS_SETTINGS_PATH = '/admin/wellness/settings';

function clinicTenantBootstrap(): TenantConfig {
  const now = new Date().toISOString();
  return tenantConfigSchema.parse({
    slug: CLINIC_TENANT_ID,
    name: 'TPT Wellness Clinic',
    lane: 'telehealth',
    domains: [...PRIMARY_CLINIC_HOSTS],
    supportEmail: 'support@tptwellness.com',
    content: DEFAULT_CLINIC_LANDING,
    theme: {
      primaryColor: CLINIC_THEME_DEFAULTS.primaryColor,
      accentColor: CLINIC_THEME_DEFAULTS.accentColor,
    },
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}

async function assertWellnessAdminAccess(): Promise<void> {
  const headersList = await headers();
  const request = new Request('http://internal/admin/wellness/settings', {
    headers: headersList,
  });

  await requireAdminSession(request);

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    throw new AdminAuthError('Wellness module is not enabled.', 403);
  }
}

function formatVercelError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('already') && normalized.includes('domain')) {
    return 'This domain is already attached to the Vercel project.';
  }
  if (normalized.includes('invalid') && normalized.includes('domain')) {
    return 'Invalid domain name. Check the format and try again.';
  }
  return message;
}

async function appendClinicDomainToFirebase(domain: string): Promise<{
  updated: boolean;
  notice?: string;
}> {
  if (!isAdminSdkConfigured()) {
    return {
      updated: false,
      notice:
        'Firebase Admin SDK is not configured. The domain was added in Vercel only. Set TENANT_CLINIC_HOSTS on Vercel (comma-separated) so the edge proxy routes traffic to the clinic lane.',
    };
  }

  const ref = getAdminFirestore().collection('tenant_config').doc(CLINIC_TENANT_ID);
  const snap = await ref.get();

  let config: TenantConfig;
  if (snap.exists) {
    const parsed = tenantConfigSchema.safeParse(snap.data());
    config = parsed.success ? parsed.data : clinicTenantBootstrap();
  } else {
    config = clinicTenantBootstrap();
  }

  const domains = config.domains.includes(domain)
    ? config.domains
    : [...config.domains, domain];

  await ref.set(
    {
      ...config,
      slug: CLINIC_TENANT_ID,
      lane: 'telehealth',
      domains,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return {
    updated: true,
    notice:
      'Domain saved to tenant_config/tpt-clinic. For edge routing without redeploy, also append the host to TENANT_CLINIC_HOSTS in Vercel environment variables.',
  };
}

export async function getClinicDomains(): Promise<string[]> {
  await assertWellnessAdminAccess();

  if (!isAdminSdkConfigured()) {
    return [...PRIMARY_CLINIC_HOSTS];
  }

  const snap = await getAdminFirestore().collection('tenant_config').doc(CLINIC_TENANT_ID).get();
  if (!snap.exists) {
    return [...PRIMARY_CLINIC_HOSTS];
  }

  const parsed = tenantConfigSchema.safeParse(snap.data());
  if (!parsed.success || parsed.data.lane !== 'telehealth') {
    return [...PRIMARY_CLINIC_HOSTS];
  }

  return parsed.data.domains.length > 0 ? parsed.data.domains : [...PRIMARY_CLINIC_HOSTS];
}

export async function addCustomDomain(domain: string): Promise<AddCustomDomainResult> {
  try {
    await assertWellnessAdminAccess();

    const validated = clinicDomainSchema.safeParse(domain);
    if (!validated.success) {
      const message = validated.error.issues[0]?.message ?? 'Invalid domain.';
      return { ok: false, error: message };
    }

    const normalized = validated.data;

    if (!isVercelDomainsConfigured()) {
      return {
        ok: false,
        error:
          'Vercel domain provisioning is not configured. Set VERCEL_API_TOKEN (or VERCEL_TOKEN) and VERCEL_PROJECT_ID.',
      };
    }

    let vercelResult;
    try {
      vercelResult = await addProjectDomain(normalized);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Vercel domain API failed.';
      return { ok: false, error: formatVercelError(message) };
    }

    const firebaseResult = await appendClinicDomainToFirebase(normalized);

    revalidatePath(WELLNESS_SETTINGS_PATH);

    return {
      ok: true,
      domain: vercelResult.name,
      verified: vercelResult.verified,
      firebaseUpdated: firebaseResult.updated,
      dnsInstructions:
        vercelResult.verification?.map((record) => ({
          type: record.type,
          host: record.domain,
          value: record.value,
        })) ?? [],
      notice: firebaseResult.notice,
    };
  } catch (caught) {
    if (caught instanceof AdminAuthError) {
      return { ok: false, error: caught.message };
    }
    const message = caught instanceof Error ? caught.message : 'Unable to add custom domain.';
    return { ok: false, error: message };
  }
}
