import 'server-only';

import { unstable_cache } from 'next/cache';
import { DEFAULT_SALES_SETTINGS, salesSettingsSchema, type InstitutionAccountRow, type SalesSettings } from '../schemas/sales';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const DOC_PATH = 'settings/sales';

async function readSalesSettings(): Promise<SalesSettings> {
  if (!isAdminSdkConfigured()) return DEFAULT_SALES_SETTINGS;

  try {
    const db = getAdminFirestore();
    const snap = await db.doc(DOC_PATH).get();
    if (!snap.exists) return DEFAULT_SALES_SETTINGS;
    const parsed = salesSettingsSchema.safeParse(snap.data());
    return parsed.success ? parsed.data : DEFAULT_SALES_SETTINGS;
  } catch (error) {
    console.error('[sales] Failed to read settings', error);
    return DEFAULT_SALES_SETTINGS;
  }
}

const getCachedSalesSettings = unstable_cache(
  () => readSalesSettings(),
  ['sales-settings'],
  { revalidate: 60, tags: ['sales-settings'] }
);

export async function getSalesSettings(): Promise<SalesSettings> {
  return getCachedSalesSettings();
}

export async function writeSalesSettings(
  patch: { aeRoster: SalesSettings['aeRoster'] },
  updatedBy: string
): Promise<SalesSettings> {
  const db = getAdminFirestore();
  const next: SalesSettings = {
    aeRoster: patch.aeRoster,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  const validated = salesSettingsSchema.parse(next);
  await db.doc(DOC_PATH).set(validated, { merge: true });
  return validated;
}

export interface SalesWorkspaceSnapshot {
  institutionAccounts: InstitutionAccountRow[];
  openQuoteCount: number;
  recentLeadCount: number;
  recentOrderCount: number;
  aeRoster: SalesSettings['aeRoster'];
}

export async function getSalesWorkspaceSnapshot(): Promise<SalesWorkspaceSnapshot> {
  if (!isAdminSdkConfigured()) {
    return {
      institutionAccounts: [],
      openQuoteCount: 0,
      recentLeadCount: 0,
      recentOrderCount: 0,
      aeRoster: [],
    };
  }

  const db = getAdminFirestore();
  const settings = await getSalesSettings();

  const [usersSnap, quotesSnap, ordersSnap] = await Promise.all([
    db.collection('users').limit(300).get(),
    db.collection('quotes').where('status', 'in', ['draft', 'sent']).get(),
    db
      .collection('orders')
      .where('status', 'in', ['paid', 'processing', 'fulfilled'])
      .limit(50)
      .get(),
  ]);

  const institutionAccounts = usersSnap.docs
    .map((doc) => {
      const data = doc.data();
      const role = String(data.role ?? 'user');
      if (role !== 'user' && role !== 'customer') return null;
      return {
        uid: doc.id,
        email: String(data.email ?? ''),
        institutionTier: (data.institutionTier as string | null | undefined) ?? null,
        institutionVerified: data.institutionVerified === true,
        assignedAeEmail: (data.assignedAeEmail as string | null | undefined) ?? null,
        leadScore: data.leadScore != null ? Number(data.leadScore) : null,
        totalPointsEarned: Number(data.totalPointsEarned ?? 0),
      };
    })
    .filter((row): row is InstitutionAccountRow => row != null && row.email.length > 0)
    .sort((a, b) => {
      if (a.institutionVerified !== b.institutionVerified) {
        return a.institutionVerified ? -1 : 1;
      }
      return (b.leadScore ?? 0) - (a.leadScore ?? 0);
    });

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentLeadCount = usersSnap.docs.filter((doc) => {
    const routedAt = doc.data().leadRoutedAt as string | undefined;
    return routedAt && new Date(routedAt).getTime() >= thirtyDaysAgo;
  }).length;

  return {
    institutionAccounts: institutionAccounts.slice(0, 50),
    openQuoteCount: quotesSnap.size,
    recentLeadCount,
    recentOrderCount: ordersSnap.size,
    aeRoster: settings.aeRoster,
  };
}
