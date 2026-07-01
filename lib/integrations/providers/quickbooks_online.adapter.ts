import 'server-only';

import { refreshQuickBooksAccessToken } from '../oauth/quickbooks.server';
import type { ClinicLedgerEntryRow } from '../../schemas/clinicLedger';
import type { ConnectionTestResult, ResolvedIntegration } from '../types';

export type QboJournalLinePayload = {
  account: string;
  postingType: 'Debit' | 'Credit';
  amount: number;
  description?: string;
};

export type QboJournalEntryPayload = {
  entryGroupId: string;
  txnDate: string;
  privateNote: string;
  lines: QboJournalLinePayload[];
};

export type QboPushResult = {
  ok: boolean;
  qboJournalId?: string;
  error?: string;
};

const CLINIC_ACCOUNT_TO_QBO: Record<string, string> = {
  nmi_clearing: 'NMI Clearing Account',
  operating_cash: 'Operating Cash',
  subscription_revenue: 'Subscription Revenue',
  merchant_fees: 'Merchant Fees',
  chargebacks: 'Chargebacks',
  rolling_reserve: 'Rolling Reserve',
};

const QBO_API_BASE =
  process.env.QBO_API_BASE?.trim() || 'https://quickbooks.api.intuit.com/v3/company';

function readAccessToken(resolved: ResolvedIntegration): string | null {
  return resolved.secrets.accessToken?.trim() || null;
}

async function ensureQuickBooksAccessToken(
  resolved: ResolvedIntegration
): Promise<string | null> {
  const accessToken = readAccessToken(resolved);
  const refreshToken = resolved.secrets.refreshToken?.trim();
  const expiresAtRaw = resolved.publicConfig.tokenExpiresAt;
  const expiresAt =
    typeof expiresAtRaw === 'string' ? new Date(expiresAtRaw).getTime() : Number.NaN;

  const isExpired = Number.isFinite(expiresAt) && expiresAt - Date.now() < 5 * 60 * 1000;

  if (accessToken && !isExpired) {
    return accessToken;
  }

  if (!refreshToken || resolved.mode === 'disconnected') {
    return accessToken;
  }

  if (resolved.mode !== 'sandbox' && resolved.mode !== 'live') {
    return accessToken;
  }

  try {
    const refreshed = await refreshQuickBooksAccessToken({
      mode: resolved.mode,
      refreshToken,
    });
    return refreshed.accessToken;
  } catch {
    return accessToken;
  }
}

export function mapClinicLedgerEntryToQboLine(
  entry: Pick<ClinicLedgerEntryRow, 'account' | 'line_type' | 'amount_cents' | 'memo'>
): QboJournalLinePayload {
  return {
    account: CLINIC_ACCOUNT_TO_QBO[entry.account] ?? entry.account,
    postingType: entry.line_type === 'debit' ? 'Debit' : 'Credit',
    amount: entry.amount_cents / 100,
    description: entry.memo ?? undefined,
  };
}

export function buildQboJournalPayload(input: {
  entryGroupId: string;
  txnDate: string;
  lines: QboJournalLinePayload[];
  privateNote?: string;
}): QboJournalEntryPayload {
  return {
    entryGroupId: input.entryGroupId,
    txnDate: input.txnDate,
    privateNote: input.privateNote ?? `TPT Clinic clearing ledger — ${input.entryGroupId}`,
    lines: input.lines,
  };
}

export async function pushJournalEntryToQbo(
  resolved: ResolvedIntegration | null,
  payload: QboJournalEntryPayload
): Promise<QboPushResult> {
  if (!resolved) {
    return { ok: false, error: 'QuickBooks Online is not connected.' };
  }

  const realmId = resolved.publicConfig.realmId?.trim();
  if (!realmId) {
    return { ok: false, error: 'QuickBooks realm ID is missing from integration config.' };
  }

  const accessToken = await ensureQuickBooksAccessToken(resolved);
  if (!accessToken) {
    return { ok: false, error: 'QuickBooks access token is unavailable.' };
  }

  if (payload.lines.length < 2) {
    return { ok: false, error: 'QuickBooks journal entry requires at least two lines.' };
  }

  const body = {
    Line: payload.lines.map((line, index) => ({
      Id: String(index + 1),
      Description: line.description,
      Amount: line.amount,
      DetailType: 'JournalEntryLineDetail',
      JournalEntryLineDetail: {
        PostingType: line.postingType,
        AccountRef: {
          name: line.account,
        },
      },
    })),
    PrivateNote: payload.privateNote,
    TxnDate: payload.txnDate,
  };

  try {
    const response = await fetch(`${QBO_API_BASE}/${realmId}/journalentry`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const json = (await response.json()) as {
      JournalEntry?: { Id?: string };
      Fault?: { Error?: Array<{ Message?: string }> };
    };

    if (!response.ok) {
      const message =
        json.Fault?.Error?.[0]?.Message ??
        `QuickBooks journal entry failed (${response.status}).`;
      return { ok: false, error: message };
    }

    return {
      ok: true,
      qboJournalId: json.JournalEntry?.Id,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'QuickBooks network error';
    return { ok: false, error: message };
  }
}

export async function testQuickBooksOnlineConnection(
  resolved: ResolvedIntegration
): Promise<ConnectionTestResult> {
  const realmId = resolved.publicConfig.realmId?.trim();
  const accessToken = await ensureQuickBooksAccessToken(resolved);

  if (!realmId || !accessToken) {
    return {
      ok: false,
      error: 'QuickBooks realm ID and access token are required. Connect via OAuth first.',
    };
  }

  try {
    const response = await fetch(`${QBO_API_BASE}/${realmId}/companyinfo/${realmId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      return { ok: true, detail: 'QuickBooks Online company info verified.' };
    }

    return {
      ok: false,
      error: `QuickBooks company info check failed (${response.status}).`,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Network error';
    return { ok: false, error: `QuickBooks connection failed: ${message}` };
  }
}
