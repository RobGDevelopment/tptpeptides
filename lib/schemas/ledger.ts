import { z } from 'zod';

/** Chart-of-accounts codes for native double-entry ledger (Sprint F/G). */
export const ledgerAccountSchema = z.enum([
  'cash',
  'revenue',
  'cogs',
  'inventory',
  'merchant_fees',
  'tax_payable',
  'shipping_revenue',
]);

export type LedgerAccount = z.infer<typeof ledgerAccountSchema>;

export const ledgerLineTypeSchema = z.enum(['debit', 'credit']);

export type LedgerLineType = z.infer<typeof ledgerLineTypeSchema>;

export const ledgerLineSchema = z.object({
  account: ledgerAccountSchema,
  type: ledgerLineTypeSchema,
  /** Major currency units (USD) — stored as decimal dollars */
  amount: z.number().positive(),
  memo: z.string().optional(),
});

export type LedgerLine = z.infer<typeof ledgerLineSchema>;

export const journalEntryTypeSchema = z.enum(['order_cleared']);

export type JournalEntryType = z.infer<typeof journalEntryTypeSchema>;

const journalEntryCoreSchema = z.object({
  orderId: z.string().min(1),
  tenantId: z.string().min(1),
  entryType: journalEntryTypeSchema,
  /** Accounting period bucket — YYYY-MM */
  period: z.string().regex(/^\d{4}-\d{2}$/),
  lines: z.array(ledgerLineSchema).min(2),
  totalDebits: z.number().nonnegative(),
  totalCredits: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  createdAt: z.string(),
});

function refineBalancedJournalEntry<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((entry, ctx) => {
    const lines = (entry as { lines: LedgerLine[] }).lines;
    const computed = summarizeLedgerLines(lines);

    if (computed.totalDebits !== computed.totalCredits) {
      ctx.addIssue({
        code: 'custom',
        message: `Journal entry is unbalanced: debits ${computed.totalDebits} != credits ${computed.totalCredits}`,
        path: ['lines'],
      });
    }

    const totalDebits = (entry as { totalDebits: number }).totalDebits;
    const totalCredits = (entry as { totalCredits: number }).totalCredits;

    if (totalDebits !== computed.totalDebits || totalCredits !== computed.totalCredits) {
      ctx.addIssue({
        code: 'custom',
        message: 'totalDebits/totalCredits must match summed line amounts',
        path: ['totalDebits'],
      });
    }
  });
}

export const createJournalEntryInputSchema = refineBalancedJournalEntry(journalEntryCoreSchema);

export type CreateJournalEntryInput = z.infer<typeof createJournalEntryInputSchema>;

export const journalEntrySchema = refineBalancedJournalEntry(
  journalEntryCoreSchema.extend({
    /** Set true when pushed to QuickBooks via accounting-sync cron */
    syncedToQbo: z.boolean().default(false),
    qboSyncId: z.string().optional(),
    syncedAt: z.string().optional(),
  })
);

export type JournalEntry = z.infer<typeof journalEntrySchema>;

const CENTS_FACTOR = 100;

export function amountToCents(amount: number): number {
  return Math.round(amount * CENTS_FACTOR);
}

export function centsToAmount(cents: number): number {
  return cents / CENTS_FACTOR;
}

export function summarizeLedgerLines(lines: LedgerLine[]): {
  totalDebits: number;
  totalCredits: number;
} {
  let debitCents = 0;
  let creditCents = 0;

  for (const line of lines) {
    const cents = amountToCents(line.amount);
    if (line.type === 'debit') debitCents += cents;
    else creditCents += cents;
  }

  return {
    totalDebits: centsToAmount(debitCents),
    totalCredits: centsToAmount(creditCents),
  };
}

/** Throws when debits and credits do not match exactly (to the cent). */
export function assertBalancedLines(lines: LedgerLine[]): {
  totalDebits: number;
  totalCredits: number;
} {
  const summary = summarizeLedgerLines(lines);
  if (amountToCents(summary.totalDebits) !== amountToCents(summary.totalCredits)) {
    throw new Error(
      `Ledger lines are unbalanced: debits ${summary.totalDebits} != credits ${summary.totalCredits}`
    );
  }
  return summary;
}

export function accountingPeriodFromIso(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 7);
  }
  return date.toISOString().slice(0, 7);
}
