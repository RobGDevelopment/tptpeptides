import 'server-only';

import { unstable_cache } from 'next/cache';
import { DEFAULT_MODULE_FLAGS } from '../data/moduleDefaults';
import { moduleFlagsSchema, type ModuleFlags } from '../schemas/modules';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

export const MODULES_DOC_PATH = 'settings/modules';

async function readModuleFlagsFromFirestore(): Promise<ModuleFlags> {
  if (!isAdminSdkConfigured()) {
    return DEFAULT_MODULE_FLAGS;
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.doc(MODULES_DOC_PATH).get();
    if (!snap.exists) {
      return DEFAULT_MODULE_FLAGS;
    }

    const parsed = moduleFlagsSchema.safeParse(snap.data());
    if (!parsed.success) {
      console.error('[modules] Invalid settings/modules document', parsed.error.flatten());
      return DEFAULT_MODULE_FLAGS;
    }

    return parsed.data;
  } catch (error) {
    console.error('[modules] Failed to read settings/modules', error);
    return DEFAULT_MODULE_FLAGS;
  }
}

const getCachedModuleFlags = unstable_cache(
  readModuleFlagsFromFirestore,
  ['module-flags'],
  { revalidate: 60, tags: ['module-flags'] }
);

/** Cached module toggles — used by server components and API guards. */
export async function getModuleFlags(): Promise<ModuleFlags> {
  return getCachedModuleFlags();
}

export async function writeModuleFlags(
  patch: Partial<ModuleFlags>,
  updatedBy: string
): Promise<ModuleFlags> {
  const db = getAdminFirestore();
  const ref = db.doc(MODULES_DOC_PATH);
  const current = await readModuleFlagsFromFirestore();

  const next: ModuleFlags = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  const validated = moduleFlagsSchema.parse(next);
  await ref.set(validated, { merge: true });
  return validated;
}
