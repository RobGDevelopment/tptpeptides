import 'server-only';

import { createAdminClient } from '../../supabase/admin';
import { withSupabaseRetry } from '../../supabase/retry.server';
import type { ClinicLedgerAccount } from '../../schemas/clinicLedger';

export type ClinicLedgerAccountBalance = {
  account: ClinicLedgerAccount;
  balanceCents: number;
  debitTotalCents: number;
  creditTotalCents: number;
};

export type ClinicQboQueueMetrics = {
  pending: number;
  processing: number;
  failed: number;
  synced: number;
};

function computeAssetBalance(debitTotal: number, creditTotal: number): number {
  return debitTotal - creditTotal;
}

export async function getClinicLedgerAccountBalances(
  accounts: ClinicLedgerAccount[]
): Promise<ClinicLedgerAccountBalance[]> {
  const supabase = createAdminClient();
  const { data, error } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_ledger_entries')
      .select('account, line_type, amount_cents')
      .in('account', accounts)
  );

  if (error) {
    throw new Error(error.message);
  }

  const totals = new Map<ClinicLedgerAccount, { debit: number; credit: number }>();
  for (const account of accounts) {
    totals.set(account, { debit: 0, credit: 0 });
  }

  for (const row of data ?? []) {
    const typed = row as {
      account: ClinicLedgerAccount;
      line_type: 'debit' | 'credit';
      amount_cents: number;
    };
    const bucket = totals.get(typed.account);
    if (!bucket) continue;

    if (typed.line_type === 'debit') {
      bucket.debit += typed.amount_cents;
    } else {
      bucket.credit += typed.amount_cents;
    }
  }

  return accounts.map((account) => {
    const bucket = totals.get(account) ?? { debit: 0, credit: 0 };
    return {
      account,
      balanceCents: computeAssetBalance(bucket.debit, bucket.credit),
      debitTotalCents: bucket.debit,
      creditTotalCents: bucket.credit,
    };
  });
}

export async function getClinicQboQueueMetrics(): Promise<ClinicQboQueueMetrics> {
  const supabase = createAdminClient();
  const { data, error } = await withSupabaseRetry(async () =>
    supabase.from('clinic_qbo_sync_queue').select('status')
  );

  if (error) {
    throw new Error(error.message);
  }

  const metrics: ClinicQboQueueMetrics = {
    pending: 0,
    processing: 0,
    failed: 0,
    synced: 0,
  };

  for (const row of data ?? []) {
    const status = (row as { status: keyof ClinicQboQueueMetrics }).status;
    if (status in metrics) {
      metrics[status] += 1;
    }
  }

  return metrics;
}
