import 'server-only';

import { unstable_cache } from 'next/cache';
import {
  DEFAULT_OPERATIONS_SETTINGS,
  operationsSettingsSchema,
  type OperationsSettings,
  type OperationsSettingsPatch,
} from '../schemas/operations';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const DOC_PATH = 'settings/operations';

async function readOperationsSettings(): Promise<OperationsSettings> {
  if (!isAdminSdkConfigured()) {
    return DEFAULT_OPERATIONS_SETTINGS;
  }

  const snap = await getAdminFirestore().doc(DOC_PATH).get();
  if (!snap.exists) return DEFAULT_OPERATIONS_SETTINGS;

  const parsed = operationsSettingsSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : DEFAULT_OPERATIONS_SETTINGS;
}

const getCachedOperationsSettings = unstable_cache(
  () => readOperationsSettings(),
  ['operations-settings'],
  { revalidate: 60, tags: ['operations-settings'] }
);

export async function getOperationsSettings(): Promise<OperationsSettings> {
  return getCachedOperationsSettings();
}

export async function writeOperationsSettings(
  patch: OperationsSettingsPatch,
  updatedBy: string
): Promise<OperationsSettings> {
  const current = await readOperationsSettings();
  const next = operationsSettingsSchema.parse({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });

  await getAdminFirestore().doc(DOC_PATH).set(next, { merge: true });
  return next;
}
