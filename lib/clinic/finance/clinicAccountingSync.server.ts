import 'server-only';

import {
  buildQboJournalPayload,
  mapClinicLedgerEntryToQboLine,
  pushJournalEntryToQbo,
} from '../../integrations/providers/quickbooks_online.adapter';
import { resolveIntegration } from '../../integrations/resolver.server';
import type { ClinicLedgerEntryRow } from '../../schemas/clinicLedger';
import { createAdminClient } from '../../supabase/admin';
import { withSupabaseRetry } from '../../supabase/retry.server';

export type ClinicAccountingSyncResult = {
  period: string;
  processed: number;
  synced: number;
  failed: number;
  skipped: number;
};

type QueueRow = {
  id: string;
  entry_group_id: string;
  payment_event_id: string | null;
  status: 'pending' | 'processing' | 'synced' | 'failed';
  attempts: number;
};

function previousCalendarMonth(): string {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

async function markQueueRow(
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await withSupabaseRetry(async () =>
    supabase.from('clinic_qbo_sync_queue').update(patch).eq('id', id)
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function loadLedgerEntries(entryGroupId: string): Promise<ClinicLedgerEntryRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_ledger_entries')
      .select(
        'id, entry_group_id, payment_event_id, account, line_type, amount_cents, currency, memo, accounting_period, created_at'
      )
      .eq('entry_group_id', entryGroupId)
      .order('created_at', { ascending: true })
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClinicLedgerEntryRow[];
}

export async function syncClinicLedgerToQuickBooks(
  period?: string
): Promise<ClinicAccountingSyncResult> {
  const targetPeriod = period ?? previousCalendarMonth();
  const supabase = createAdminClient();

  const { data: queueRows, error } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_qbo_sync_queue')
      .select('id, entry_group_id, payment_event_id, status, attempts')
      .in('status', ['pending', 'failed'])
      .order('created_at', { ascending: true })
      .limit(50)
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (queueRows ?? []) as QueueRow[];
  const result: ClinicAccountingSyncResult = {
    period: targetPeriod,
    processed: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
  };

  if (rows.length === 0) {
    return result;
  }

  let resolvedIntegration = null;
  try {
    resolvedIntegration = await resolveIntegration('quickbooks_online', { mode: 'live' });
  } catch {
    resolvedIntegration = null;
  }

  for (const row of rows) {
    result.processed += 1;

    const entries = await loadLedgerEntries(row.entry_group_id);
    const periodEntries = entries.filter((entry) => entry.accounting_period === targetPeriod);

    if (periodEntries.length === 0) {
      result.skipped += 1;
      continue;
    }

    await markQueueRow(row.id, {
      status: 'processing',
      attempts: row.attempts + 1,
    });

    const payload = buildQboJournalPayload({
      entryGroupId: row.entry_group_id,
      txnDate: `${targetPeriod}-01`,
      lines: periodEntries.map((entry) => mapClinicLedgerEntryToQboLine(entry)),
      privateNote: `TPT Clinic clearing ledger sync — ${targetPeriod}`,
    });

    const pushResult = await pushJournalEntryToQbo(resolvedIntegration, payload);

    if (pushResult.ok) {
      result.synced += 1;
      await markQueueRow(row.id, {
        status: 'synced',
        qbo_journal_id: pushResult.qboJournalId ?? null,
        error_message: null,
      });
    } else {
      result.failed += 1;
      await markQueueRow(row.id, {
        status: 'failed',
        error_message: pushResult.error ?? 'QuickBooks sync failed.',
        next_attempt_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    }
  }

  return result;
}
