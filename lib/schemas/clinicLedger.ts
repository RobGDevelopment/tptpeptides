import { z } from 'zod';
import { clinicPaymentGatewaySchema } from './clinicRevenue';

export const clinicPaymentEventTypeSchema = z.enum([
  'subscription_charge',
  'subscription_refund',
  'merchant_fee',
  'chargeback',
  'settlement_transfer',
  'rolling_reserve_hold',
  'rolling_reserve_release',
]);

export type ClinicPaymentEventType = z.infer<typeof clinicPaymentEventTypeSchema>;

export const clinicLedgerAccountSchema = z.enum([
  'nmi_clearing',
  'operating_cash',
  'subscription_revenue',
  'merchant_fees',
  'chargebacks',
  'rolling_reserve',
]);

export type ClinicLedgerAccount = z.infer<typeof clinicLedgerAccountSchema>;

export const clinicLedgerLineTypeSchema = z.enum(['debit', 'credit']);

export type ClinicLedgerLineType = z.infer<typeof clinicLedgerLineTypeSchema>;

export const clinicQboSyncStatusSchema = z.enum([
  'pending',
  'processing',
  'synced',
  'failed',
]);

export type ClinicQboSyncStatus = z.infer<typeof clinicQboSyncStatusSchema>;

export const accountingPeriodSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const clinicLedgerLineInputSchema = z.object({
  account: clinicLedgerAccountSchema,
  lineType: clinicLedgerLineTypeSchema,
  amountCents: z.number().int().positive(),
  memo: z.string().max(500).optional(),
});

export type ClinicLedgerLineInput = z.infer<typeof clinicLedgerLineInputSchema>;

export const postClinicPaymentEventInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(256),
  eventType: clinicPaymentEventTypeSchema,
  paymentGateway: clinicPaymentGatewaySchema.default('nmi'),
  gatewayTransactionId: z.string().max(200).optional().nullable(),
  gatewayBatchId: z.string().max(200).optional().nullable(),
  subscriptionId: z.string().uuid().optional().nullable(),
  patientId: z.string().uuid().optional().nullable(),
  /** Signed amount in minor units — negative allowed for reversals at ingest */
  amountCents: z.number().int().refine((value) => value !== 0, {
    message: 'amountCents must be non-zero',
  }),
  currency: z.string().length(3).default('USD'),
  accountingPeriod: accountingPeriodSchema.optional(),
  rawPayload: z.record(z.string(), z.unknown()).default({}),
  enqueueQboSync: z.boolean().default(true),
});

export type PostClinicPaymentEventInput = z.infer<typeof postClinicPaymentEventInputSchema>;

export const clinicPaymentEventRowSchema = z.object({
  id: z.string().uuid(),
  idempotency_key: z.string(),
  event_type: clinicPaymentEventTypeSchema,
  payment_gateway: clinicPaymentGatewaySchema,
  gateway_transaction_id: z.string().nullable(),
  gateway_batch_id: z.string().nullable(),
  subscription_id: z.string().uuid().nullable(),
  patient_id: z.string().uuid().nullable(),
  amount_cents: z.number().int(),
  currency: z.string().length(3),
  accounting_period: accountingPeriodSchema,
  entry_group_id: z.string().uuid(),
  raw_payload: z.record(z.string(), z.unknown()),
  processed_at: z.string(),
  created_at: z.string(),
});

export type ClinicPaymentEventRow = z.infer<typeof clinicPaymentEventRowSchema>;

export const clinicLedgerEntryRowSchema = z.object({
  id: z.string().uuid(),
  entry_group_id: z.string().uuid(),
  payment_event_id: z.string().uuid(),
  account: clinicLedgerAccountSchema,
  line_type: clinicLedgerLineTypeSchema,
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3),
  memo: z.string().nullable(),
  accounting_period: accountingPeriodSchema,
  created_at: z.string(),
});

export type ClinicLedgerEntryRow = z.infer<typeof clinicLedgerEntryRowSchema>;

export const clinicSettlementBatchInputSchema = z.object({
  gatewayBatchId: z.string().min(1).max(200),
  paymentGateway: clinicPaymentGatewaySchema.default('nmi'),
  grossAmountCents: z.number().int().nonnegative(),
  feeAmountCents: z.number().int().nonnegative(),
  netAmountCents: z.number().int().nonnegative(),
  reserveAmountCents: z.number().int().nonnegative().default(0),
  currency: z.string().length(3).default('USD'),
  settledAt: z.string().datetime(),
  paymentEventId: z.string().uuid().optional().nullable(),
  rawPayload: z.record(z.string(), z.unknown()).default({}),
});

export type ClinicSettlementBatchInput = z.infer<typeof clinicSettlementBatchInputSchema>;

export const clinicSettlementBatchRowSchema = z.object({
  id: z.string().uuid(),
  gateway_batch_id: z.string(),
  payment_gateway: clinicPaymentGatewaySchema,
  gross_amount_cents: z.number().int().nonnegative(),
  fee_amount_cents: z.number().int().nonnegative(),
  net_amount_cents: z.number().int().nonnegative(),
  reserve_amount_cents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  settled_at: z.string(),
  payment_event_id: z.string().uuid().nullable(),
  raw_payload: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ClinicSettlementBatchRow = z.infer<typeof clinicSettlementBatchRowSchema>;

export const clinicQboSyncQueueRowSchema = z.object({
  id: z.string().uuid(),
  entry_group_id: z.string().uuid(),
  payment_event_id: z.string().uuid().nullable(),
  status: clinicQboSyncStatusSchema,
  qbo_journal_id: z.string().nullable(),
  error_message: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  next_attempt_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ClinicQboSyncQueueRow = z.infer<typeof clinicQboSyncQueueRowSchema>;

export type PostClinicPaymentEventResult = {
  paymentEventId: string;
  entryGroupId: string;
  ledgerEntryIds: string[];
  idempotentReplay: boolean;
  qboQueueId: string | null;
};

const CENTS_FACTOR = 100;

export function accountingPeriodFromIso(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 7);
  }
  return date.toISOString().slice(0, 7);
}

export function amountToCents(amount: number): number {
  return Math.round(amount * CENTS_FACTOR);
}

export function centsToAmount(cents: number): number {
  return cents / CENTS_FACTOR;
}

export function summarizeClinicLedgerLines(lines: ClinicLedgerLineInput[]): {
  totalDebits: number;
  totalCredits: number;
} {
  let debitTotal = 0;
  let creditTotal = 0;

  for (const line of lines) {
    if (line.lineType === 'debit') debitTotal += line.amountCents;
    else creditTotal += line.amountCents;
  }

  return { totalDebits: debitTotal, totalCredits: creditTotal };
}

/** Throws when debits and credits do not match exactly (to the cent). */
export function assertBalancedClinicLedgerLines(lines: ClinicLedgerLineInput[]): {
  totalDebits: number;
  totalCredits: number;
} {
  const summary = summarizeClinicLedgerLines(lines);
  if (summary.totalDebits !== summary.totalCredits) {
    throw new Error(
      `Clinic ledger lines are unbalanced: debits ${summary.totalDebits} != credits ${summary.totalCredits}`
    );
  }
  return summary;
}

export function mapPaymentEventRow(row: ClinicPaymentEventRow) {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    eventType: row.event_type,
    paymentGateway: row.payment_gateway,
    gatewayTransactionId: row.gateway_transaction_id,
    gatewayBatchId: row.gateway_batch_id,
    subscriptionId: row.subscription_id,
    patientId: row.patient_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    accountingPeriod: row.accounting_period,
    entryGroupId: row.entry_group_id,
    rawPayload: row.raw_payload,
    processedAt: row.processed_at,
    createdAt: row.created_at,
  };
}

export function mapLedgerEntryRow(row: ClinicLedgerEntryRow) {
  return {
    id: row.id,
    entryGroupId: row.entry_group_id,
    paymentEventId: row.payment_event_id,
    account: row.account,
    lineType: row.line_type,
    amountCents: row.amount_cents,
    currency: row.currency,
    memo: row.memo,
    accountingPeriod: row.accounting_period,
    createdAt: row.created_at,
  };
}
