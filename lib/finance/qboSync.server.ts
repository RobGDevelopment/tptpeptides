import 'server-only';

import {
  amountToCents,
  centsToAmount,
  type JournalEntry,
  type LedgerAccount,
} from '../schemas/ledger';
import {
  listJournalEntriesForPeriod,
  markJournalEntriesSyncedToQbo,
} from '../firebase/ledger.server';
import { getValidQboAccessToken, isQuickBooksOAuthConfigured } from './qboAuth.server';

export interface QboAggregatedLine {
  account: LedgerAccount;
  debit: number;
  credit: number;
}

export interface QboJournalBatchPayload {
  period: string;
  realmId: string;
  privateNote: string;
  lines: QboAggregatedLine[];
  entryCount: number;
  totalDebits: number;
  totalCredits: number;
}

export function isQuickBooksConfigured(): boolean {
  return isQuickBooksOAuthConfigured();
}

function qboRealmId(): string {
  const realmId = process.env.QBO_REALM_ID?.trim();
  if (!realmId) {
    throw new Error('QBO_REALM_ID is not configured');
  }
  return realmId;
}

/** Aggregates finalized journal entries for a calendar month. */
export function aggregateJournalEntries(
  entries: Array<{ id: string; entry: JournalEntry }>
): QboJournalBatchPayload {
  const unsynced = entries.filter(({ entry }) => !entry.syncedToQbo);
  const period = unsynced[0]?.entry.period ?? entries[0]?.entry.period ?? '';

  const totals = new Map<LedgerAccount, { debitCents: number; creditCents: number }>();

  for (const { entry } of unsynced) {
    for (const line of entry.lines) {
      const bucket = totals.get(line.account) ?? { debitCents: 0, creditCents: 0 };
      const cents = amountToCents(line.amount);
      if (line.type === 'debit') bucket.debitCents += cents;
      else bucket.creditCents += cents;
      totals.set(line.account, bucket);
    }
  }

  const lines: QboAggregatedLine[] = Array.from(totals.entries()).map(([account, value]) => ({
    account,
    debit: centsToAmount(value.debitCents),
    credit: centsToAmount(value.creditCents),
  }));

  const totalDebits = centsToAmount(lines.reduce((sum, line) => sum + amountToCents(line.debit), 0));
  const totalCredits = centsToAmount(
    lines.reduce((sum, line) => sum + amountToCents(line.credit), 0)
  );

  return {
    period,
    realmId: process.env.QBO_REALM_ID?.trim() || 'unconfigured',
    privateNote: `MedFit native ledger sync — ${period}`,
    lines,
    entryCount: unsynced.length,
    totalDebits,
    totalCredits,
  };
}

/** Maps native accounts to QBO account refs — VERIFY WITH SANDBOX chart of accounts. */
function qboAccountRef(account: LedgerAccount): { value: string; name: string } {
  const map: Record<LedgerAccount, { value: string; name: string }> = {
    cash: { value: process.env.QBO_ACCOUNT_CASH_ID ?? '1', name: 'Checking' },
    revenue: { value: process.env.QBO_ACCOUNT_REVENUE_ID ?? '2', name: 'Sales Revenue' },
    cogs: { value: process.env.QBO_ACCOUNT_COGS_ID ?? '3', name: 'Cost of Goods Sold' },
    inventory: { value: process.env.QBO_ACCOUNT_INVENTORY_ID ?? '4', name: 'Inventory Asset' },
    merchant_fees: {
      value: process.env.QBO_ACCOUNT_FEES_ID ?? '5',
      name: 'Merchant Processing Fees',
    },
    tax_payable: {
      value: process.env.QBO_ACCOUNT_TAX_PAYABLE_ID ?? '6',
      name: 'Sales Tax Payable',
    },
    shipping_revenue: {
      value: process.env.QBO_ACCOUNT_SHIPPING_REVENUE_ID ?? '7',
      name: 'Shipping Revenue',
    },
  };

  return map[account];
}

/** Builds QuickBooks Online JournalEntry REST body — scaffold until OAuth tokens are live. */
export function buildQboJournalEntryRequest(batch: QboJournalBatchPayload): Record<string, unknown> {
  const lineItems = batch.lines.flatMap((line) => {
    const ref = qboAccountRef(line.account);
    const rows: Record<string, unknown>[] = [];

    if (line.debit > 0) {
      rows.push({
        DetailType: 'JournalEntryLineDetail',
        Amount: line.debit,
        JournalEntryLineDetail: {
          PostingType: 'Debit',
          AccountRef: { value: ref.value, name: ref.name },
        },
      });
    }

    if (line.credit > 0) {
      rows.push({
        DetailType: 'JournalEntryLineDetail',
        Amount: line.credit,
        JournalEntryLineDetail: {
          PostingType: 'Credit',
          AccountRef: { value: ref.value, name: ref.name },
        },
      });
    }

    return rows;
  });

  return {
    Line: lineItems,
    PrivateNote: batch.privateNote,
  };
}

export async function syncPeriodToQuickBooks(period: string): Promise<{
  synced: boolean;
  period: string;
  entryCount: number;
  qboResponse?: unknown;
  payload?: QboJournalBatchPayload;
}> {
  const entries = await listJournalEntriesForPeriod(period);
  const pending = entries.filter(({ entry }) => !entry.syncedToQbo);

  if (pending.length === 0) {
    return { synced: false, period, entryCount: 0 };
  }

  const batch = aggregateJournalEntries(entries);
  const body = buildQboJournalEntryRequest(batch);

  if (!isQuickBooksConfigured()) {
    return {
      synced: false,
      period,
      entryCount: pending.length,
      payload: batch,
    };
  }

  const accessToken = await getValidQboAccessToken();
  if (!accessToken) {
    throw new Error('QuickBooks access token is not available');
  }
  const realmId = qboRealmId();
  const baseUrl =
    process.env.QBO_API_BASE?.trim() || 'https://quickbooks.api.intuit.com/v3/company';

  const response = await fetch(`${baseUrl}/${realmId}/journalentry?minorversion=65`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const responseText = await response.text();
  let qboResponse: unknown = null;
  if (responseText) {
    try {
      qboResponse = JSON.parse(responseText) as unknown;
    } catch {
      qboResponse = { raw: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(`QuickBooks journal entry push failed (${response.status})`);
  }

  const syncId =
    typeof qboResponse === 'object' &&
    qboResponse != null &&
    'JournalEntry' in qboResponse &&
    typeof (qboResponse as { JournalEntry?: { Id?: string } }).JournalEntry?.Id === 'string'
      ? (qboResponse as { JournalEntry: { Id: string } }).JournalEntry.Id
      : `manual-${period}-${Date.now()}`;

  await markJournalEntriesSyncedToQbo(
    pending.map(({ id }) => id),
    syncId
  );

  const { saveAccountingSettings } = await import('../firebase/accountingSettings.server');
  await saveAccountingSettings({
    lastQboSyncAt: new Date().toISOString(),
    lastQboSyncPeriod: period,
    lastQboSyncId: syncId,
  });

  return {
    synced: true,
    period,
    entryCount: pending.length,
    qboResponse,
    payload: batch,
  };
}
