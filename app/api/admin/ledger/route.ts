import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getAccountingSettings } from '../../../../lib/firebase/accountingSettings.server';
import { listRecentJournalEntries } from '../../../../lib/firebase/ledger.server';
import { isQuickBooksOAuthConfigured } from '../../../../lib/finance/qboAuth.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);

    const entries = await listRecentJournalEntries(100);
    const accounting = await getAccountingSettings();

    return NextResponse.json({
      entries: entries.map(({ id, entry }) => ({
        id,
        orderId: entry.orderId,
        tenantId: entry.tenantId,
        entryType: entry.entryType,
        period: entry.period,
        totalDebits: entry.totalDebits,
        totalCredits: entry.totalCredits,
        currency: entry.currency,
        createdAt: entry.createdAt,
        syncedToQbo: entry.syncedToQbo,
        syncedAt: entry.syncedAt ?? null,
        qboSyncId: entry.qboSyncId ?? null,
        lineCount: entry.lines.length,
      })),
      qboSync: {
        configured: isQuickBooksOAuthConfigured(),
        lastSyncAt: accounting?.lastQboSyncAt ?? null,
        lastSyncPeriod: accounting?.lastQboSyncPeriod ?? null,
        lastSyncId: accounting?.lastQboSyncId ?? null,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[admin/ledger] failed', error);
    return NextResponse.json({ error: 'Unable to load ledger entries' }, { status: 500 });
  }
}
