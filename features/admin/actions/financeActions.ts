'use server';

import { headers } from 'next/headers';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import {
  getClinicLedgerAccountBalances,
  getClinicQboQueueMetrics,
} from '../../../lib/clinic/finance/ledgerBalances.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import type { ClinicLedgerAccount } from '../../../lib/schemas/clinicLedger';

export type ClinicFinanceMetrics = {
  nmiClearingBalanceCents: number;
  rollingReserveBalanceCents: number;
  qboPendingCount: number;
  qboProcessingCount: number;
  qboFailedCount: number;
  qboSyncedCount: number;
  lastUpdatedAt: string;
};

async function assertWellnessAdminAccess(): Promise<void> {
  const headersList = await headers();
  const request = new Request('http://internal/admin/wellness/marketing', {
    headers: headersList,
  });

  await requireAdminSession(request);

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    throw new AdminAuthError('Wellness module is not enabled.', 403);
  }
}

function readBalance(
  balances: Awaited<ReturnType<typeof getClinicLedgerAccountBalances>>,
  account: ClinicLedgerAccount
): number {
  return balances.find((row) => row.account === account)?.balanceCents ?? 0;
}

export async function getClinicFinanceMetrics(): Promise<ClinicFinanceMetrics> {
  await assertWellnessAdminAccess();

  const [balances, queueMetrics] = await Promise.all([
    getClinicLedgerAccountBalances(['nmi_clearing', 'rolling_reserve']),
    getClinicQboQueueMetrics(),
  ]);

  return {
    nmiClearingBalanceCents: readBalance(balances, 'nmi_clearing'),
    rollingReserveBalanceCents: readBalance(balances, 'rolling_reserve'),
    qboPendingCount: queueMetrics.pending,
    qboProcessingCount: queueMetrics.processing,
    qboFailedCount: queueMetrics.failed,
    qboSyncedCount: queueMetrics.synced,
    lastUpdatedAt: new Date().toISOString(),
  };
}
