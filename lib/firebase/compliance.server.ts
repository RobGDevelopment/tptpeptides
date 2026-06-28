import 'server-only';

import { unstable_cache } from 'next/cache';
import { DEFAULT_COMPLIANCE_SETTINGS } from '../schemas/compliance';
import { complianceSettingsSchema, type ComplianceSettings } from '../schemas/compliance';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const DOC_PATH = 'settings/compliance';

async function readComplianceSettings(): Promise<ComplianceSettings> {
  if (!isAdminSdkConfigured()) {
    return DEFAULT_COMPLIANCE_SETTINGS;
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.doc(DOC_PATH).get();
    if (!snap.exists) return DEFAULT_COMPLIANCE_SETTINGS;

    const parsed = complianceSettingsSchema.safeParse(snap.data());
    return parsed.success ? parsed.data : DEFAULT_COMPLIANCE_SETTINGS;
  } catch (error) {
    console.error('[compliance] Failed to read settings', error);
    return DEFAULT_COMPLIANCE_SETTINGS;
  }
}

const getCachedComplianceSettings = unstable_cache(
  () => readComplianceSettings(),
  ['compliance-settings'],
  { revalidate: 60, tags: ['compliance-settings'] }
);

export async function getComplianceSettings(): Promise<ComplianceSettings> {
  return getCachedComplianceSettings();
}

export async function writeComplianceSettings(
  patch: { restrictedStates: string[] },
  updatedBy: string
): Promise<ComplianceSettings> {
  const db = getAdminFirestore();
  const next: ComplianceSettings = {
    restrictedStates: patch.restrictedStates.map((state) => state.toUpperCase()),
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  const validated = complianceSettingsSchema.parse(next);
  await db.doc(DOC_PATH).set(validated, { merge: true });
  return validated;
}
