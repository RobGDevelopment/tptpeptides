import 'server-only';

import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const DOC_PATH = 'settings/accounting';

export const accountingSettingsSchema = z.object({
  qboAccessToken: z.string().optional(),
  qboRefreshToken: z.string().optional(),
  qboRealmId: z.string().optional(),
  /** ISO timestamp — access token expiry */
  qboTokenExpiresAt: z.string().optional(),
  /** Last successful headless QBO journal sync */
  lastQboSyncAt: z.string().optional(),
  lastQboSyncPeriod: z.string().optional(),
  lastQboSyncId: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type AccountingSettings = z.infer<typeof accountingSettingsSchema>;

export async function getAccountingSettings(): Promise<AccountingSettings | null> {
  if (!isAdminSdkConfigured()) return null;

  const snap = await getAdminFirestore().doc(DOC_PATH).get();
  if (!snap.exists) return null;

  const parsed = accountingSettingsSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}

export async function saveAccountingSettings(
  patch: Partial<AccountingSettings>
): Promise<void> {
  if (!isAdminSdkConfigured()) {
    throw new Error('Firebase Admin SDK is not configured');
  }

  await getAdminFirestore()
    .doc(DOC_PATH)
    .set(
      {
        ...patch,
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}
