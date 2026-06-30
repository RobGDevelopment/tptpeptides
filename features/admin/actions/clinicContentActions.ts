'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../lib/firebase/admin';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import { DEFAULT_CLINIC_LANDING } from '../../../lib/data/clinicLandingDefaults';
import { normalizeClinicLandingHeroMedia } from '../../../lib/clinic/heroMedia';
import {
  clinicLandingContentSchema,
  mergeClinicLandingContent,
  type ClinicLandingContent,
} from '../../../lib/schemas/clinicLanding';
import { tenantConfigSchema, type TenantConfig } from '../../../lib/schemas/tenant';
import { CLINIC_TENANT_ID, PRIMARY_CLINIC_HOSTS } from '../../../lib/tenant/constants';
import { sanitizeThemeInput } from '../../../lib/tenant/theme';
import { CLINIC_THEME_DEFAULTS } from '../../../lib/data/clinicThemeDefaults';

const WELLNESS_SETTINGS_PATH = '/admin/wellness/settings';
const ADMIN_PATH = '/admin';

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
  const request = new Request('http://internal/admin/wellness', {
    headers: headersList,
  });

  await requireAdminSession(request);

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    throw new AdminAuthError('Wellness module is not enabled.', 403);
  }
}

async function loadClinicTenantConfig(): Promise<TenantConfig> {
  if (!isAdminSdkConfigured()) {
    return clinicTenantBootstrap();
  }

  const snap = await getAdminFirestore().collection('tenant_config').doc(CLINIC_TENANT_ID).get();
  if (!snap.exists) {
    return clinicTenantBootstrap();
  }

  const parsed = tenantConfigSchema.safeParse(snap.data());
  if (!parsed.success || parsed.data.lane !== 'telehealth') {
    return clinicTenantBootstrap();
  }

  return parsed.data;
}

export async function getClinicLandingContent(): Promise<ClinicLandingContent> {
  await assertWellnessAdminAccess();
  const config = await loadClinicTenantConfig();
  const merged = mergeClinicLandingContent(config.content, DEFAULT_CLINIC_LANDING);
  return clinicLandingContentSchema.parse(
    normalizeClinicLandingHeroMedia(
      {
        ...merged,
        primaryColor: config.theme?.primaryColor ?? merged.primaryColor,
        accentColor: config.theme?.accentColor ?? merged.accentColor,
        logoUrl: config.theme?.logoUrl ?? merged.logoUrl,
        heroImageUrl: merged.heroImageUrl || DEFAULT_CLINIC_LANDING.heroImageUrl,
      },
      DEFAULT_CLINIC_LANDING
    )
  );
}

export async function updateClinicLandingContent(
  payload: ClinicLandingContent
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertWellnessAdminAccess();

    const validated = clinicLandingContentSchema.safeParse(payload);
    if (!validated.success) {
      const message = validated.error.issues[0]?.message ?? 'Invalid clinic landing content.';
      return { ok: false, error: message };
    }

    if (!isAdminSdkConfigured()) {
      return {
        ok: false,
        error: 'Firebase Admin SDK is not configured. Cannot save clinic landing content.',
      };
    }

    const config = await loadClinicTenantConfig();
    const ref = getAdminFirestore().collection('tenant_config').doc(CLINIC_TENANT_ID);

    const theme = sanitizeThemeInput({
      primaryColor: validated.data.primaryColor,
      accentColor: validated.data.accentColor,
      logoUrl: validated.data.logoUrl,
    });

    await ref.set(
      {
        ...config,
        slug: CLINIC_TENANT_ID,
        lane: 'telehealth',
        ...(theme ? { theme: { ...config.theme, ...theme } } : {}),
        content: {
          ...config.content,
          ...validated.data,
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    revalidatePath(WELLNESS_SETTINGS_PATH);
    revalidatePath(ADMIN_PATH);
    revalidatePath('/clinic');

    return { ok: true };
  } catch (caught) {
    if (caught instanceof AdminAuthError) {
      return { ok: false, error: caught.message };
    }
    const message = caught instanceof Error ? caught.message : 'Unable to save clinic landing content.';
    return { ok: false, error: message };
  }
}
