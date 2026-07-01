import 'server-only';

import { createAdminClient } from '../../supabase/admin';
import { withSupabaseRetry } from '../../supabase/retry.server';
import {
  accountingPeriodFromIso,
  assertBalancedClinicLedgerLines,
  type ClinicLedgerLineInput,
  type ClinicPaymentEventType,
  type PostClinicPaymentEventInput,
  type PostClinicPaymentEventResult,
  postClinicPaymentEventInputSchema,
} from '../../schemas/clinicLedger';

export class ClinicLedgerBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClinicLedgerBalanceError';
  }
}

function absoluteCents(amountCents: number): number {
  return Math.abs(amountCents);
}

/**
 * Maps processor events to balanced double-entry lines using the NMI clearing methodology.
 */
export function buildLedgerLinesForEvent(
  eventType: ClinicPaymentEventType,
  amountCents: number,
  memoContext: string
): ClinicLedgerLineInput[] {
  const amount = absoluteCents(amountCents);
  const memo = memoContext.slice(0, 500);

  switch (eventType) {
    case 'subscription_charge':
      return [
        { account: 'nmi_clearing', lineType: 'debit', amountCents: amount, memo },
        { account: 'subscription_revenue', lineType: 'credit', amountCents: amount, memo },
      ];
    case 'subscription_refund':
      return [
        { account: 'subscription_revenue', lineType: 'debit', amountCents: amount, memo },
        { account: 'nmi_clearing', lineType: 'credit', amountCents: amount, memo },
      ];
    case 'merchant_fee':
      return [
        { account: 'merchant_fees', lineType: 'debit', amountCents: amount, memo },
        { account: 'nmi_clearing', lineType: 'credit', amountCents: amount, memo },
      ];
    case 'chargeback':
      return [
        { account: 'chargebacks', lineType: 'debit', amountCents: amount, memo },
        { account: 'nmi_clearing', lineType: 'credit', amountCents: amount, memo },
      ];
    case 'settlement_transfer':
      return [
        { account: 'operating_cash', lineType: 'debit', amountCents: amount, memo },
        { account: 'nmi_clearing', lineType: 'credit', amountCents: amount, memo },
      ];
    case 'rolling_reserve_hold':
      return [
        { account: 'rolling_reserve', lineType: 'debit', amountCents: amount, memo },
        { account: 'nmi_clearing', lineType: 'credit', amountCents: amount, memo },
      ];
    case 'rolling_reserve_release':
      return [
        { account: 'nmi_clearing', lineType: 'debit', amountCents: amount, memo },
        { account: 'rolling_reserve', lineType: 'credit', amountCents: amount, memo },
      ];
    default: {
      const exhaustive: never = eventType;
      throw new ClinicLedgerBalanceError(`Unsupported clinic payment event type: ${exhaustive}`);
    }
  }
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

type PaymentEventInsertRow = {
  id: string;
  entry_group_id: string;
};

async function findExistingPaymentEvent(
  idempotencyKey: string
): Promise<{ id: string; entry_group_id: string } | null> {
  const supabase = createAdminClient();
  const { data, error } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_payment_events')
      .select('id, entry_group_id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data as PaymentEventInsertRow | null) ?? null;
}

async function listLedgerEntryIdsForEvent(paymentEventId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await withSupabaseRetry(async () =>
    supabase.from('clinic_ledger_entries').select('id').eq('payment_event_id', paymentEventId)
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => (row as { id: string }).id);
}

async function findQboQueueId(entryGroupId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_qbo_sync_queue')
      .select('id')
      .eq('entry_group_id', entryGroupId)
      .maybeSingle()
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Idempotently ingests a clinic processor event and writes balanced ledger lines.
 */
export async function postClinicPaymentEvent(
  input: PostClinicPaymentEventInput
): Promise<PostClinicPaymentEventResult> {
  const parsed = postClinicPaymentEventInputSchema.parse(input);
  const accountingPeriod =
    parsed.accountingPeriod ?? accountingPeriodFromIso(new Date().toISOString());
  const currency = parsed.currency.toUpperCase();
  const memoContext = `${parsed.eventType} ${parsed.gatewayTransactionId ?? parsed.idempotencyKey}`;

  const ledgerLines = buildLedgerLinesForEvent(parsed.eventType, parsed.amountCents, memoContext);

  try {
    assertBalancedClinicLedgerLines(ledgerLines);
  } catch (caught) {
    throw new ClinicLedgerBalanceError(
      caught instanceof Error ? caught.message : 'Unbalanced clinic ledger lines'
    );
  }

  const supabase = createAdminClient();
  const entryGroupId = crypto.randomUUID();

  const { data: insertedEvent, error: insertError } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_payment_events')
      .insert({
        idempotency_key: parsed.idempotencyKey,
        event_type: parsed.eventType,
        payment_gateway: parsed.paymentGateway,
        gateway_transaction_id: parsed.gatewayTransactionId ?? null,
        gateway_batch_id: parsed.gatewayBatchId ?? null,
        subscription_id: parsed.subscriptionId ?? null,
        patient_id: parsed.patientId ?? null,
        amount_cents: parsed.amountCents,
        currency,
        accounting_period: accountingPeriod,
        entry_group_id: entryGroupId,
        raw_payload: parsed.rawPayload,
      })
      .select('id, entry_group_id')
      .single()
  );

  if (insertError) {
    if (isUniqueViolation(insertError)) {
      const existing = await findExistingPaymentEvent(parsed.idempotencyKey);
      if (!existing) {
        throw new Error('Idempotency conflict without existing clinic payment event row.');
      }

      const ledgerEntryIds = await listLedgerEntryIdsForEvent(existing.id);
      const qboQueueId = await findQboQueueId(existing.entry_group_id);

      return {
        paymentEventId: existing.id,
        entryGroupId: existing.entry_group_id,
        ledgerEntryIds,
        idempotentReplay: true,
        qboQueueId,
      };
    }

    throw new Error(insertError.message);
  }

  const paymentEventId = (insertedEvent as PaymentEventInsertRow).id;
  const resolvedEntryGroupId = (insertedEvent as PaymentEventInsertRow).entry_group_id;

  const ledgerRows = ledgerLines.map((line) => ({
    entry_group_id: resolvedEntryGroupId,
    payment_event_id: paymentEventId,
    account: line.account,
    line_type: line.lineType,
    amount_cents: line.amountCents,
    currency,
    memo: line.memo ?? null,
    accounting_period: accountingPeriod,
  }));

  const { data: insertedLedger, error: ledgerError } = await withSupabaseRetry(async () =>
    supabase.from('clinic_ledger_entries').insert(ledgerRows).select('id')
  );

  if (ledgerError) {
    throw new Error(ledgerError.message);
  }

  let qboQueueId: string | null = null;

  if (parsed.enqueueQboSync) {
    const { data: queueRow, error: queueError } = await withSupabaseRetry(async () =>
      supabase
        .from('clinic_qbo_sync_queue')
        .insert({
          entry_group_id: resolvedEntryGroupId,
          payment_event_id: paymentEventId,
          status: 'pending',
        })
        .select('id')
        .single()
    );

    if (queueError && !isUniqueViolation(queueError)) {
      throw new Error(queueError.message);
    }

    qboQueueId = (queueRow as { id: string } | null)?.id ?? null;
  }

  return {
    paymentEventId,
    entryGroupId: resolvedEntryGroupId,
    ledgerEntryIds: (insertedLedger ?? []).map((row) => (row as { id: string }).id),
    idempotentReplay: false,
    qboQueueId,
  };
}
