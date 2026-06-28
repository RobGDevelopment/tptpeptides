import 'server-only';

import {
  accountingPeriodFromIso,
  assertBalancedLines,
  centsToAmount,
  amountToCents,
  type CreateJournalEntryInput,
  type LedgerLine,
} from '../schemas/ledger';
import type { OrderDoc } from '../schemas/order';
import { productDocSchema } from '../schemas/product';
import { DEFAULT_TENANT_ID } from '../tenant/constants';
import { appendJournalEntry, LedgerBalanceError } from '../firebase/ledger.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';

export interface OrderJournalInput {
  orderId: string;
  order: OrderDoc;
  /** Estimated merchant processing fee in major units — optional */
  merchantFeeAmount?: number;
}

/** Resolves unit cost per line item from product baseCost (fallback: 45% of price). */
async function resolveLineCogs(
  items: OrderDoc['items']
): Promise<{ totalCogs: number; lines: Array<{ productId: string; cogs: number }> }> {
  if (!isAdminSdkConfigured()) {
    const fallback = items.reduce(
      (sum, item) => sum + item.price * item.quantity * 0.45,
      0
    );
    return { totalCogs: roundMoney(fallback), lines: [] };
  }

  const db = getAdminFirestore();
  let totalCogsCents = 0;
  const lines: Array<{ productId: string; cogs: number }> = [];

  for (const item of items) {
    const snap = await db.collection('products').doc(item.id).get();
    let unitCost = item.price * 0.45;

    if (snap.exists) {
      const parsed = productDocSchema.safeParse(snap.data());
      if (parsed.success && parsed.data.baseCost != null && parsed.data.baseCost > 0) {
        unitCost = parsed.data.baseCost;
      }
    }

    const lineCogs = unitCost * item.quantity;
    totalCogsCents += amountToCents(lineCogs);
    lines.push({ productId: item.id, cogs: roundMoney(lineCogs) });
  }

  return { totalCogs: centsToAmount(totalCogsCents), lines };
}

function roundMoney(value: number): number {
  return centsToAmount(amountToCents(value));
}

/**
 * Builds a balanced double-entry payload for a cleared order:
 * - Debit Cash / Credit Revenue (+ tax payable + shipping revenue)
 * - Debit COGS / Credit Inventory
 * - Optional merchant fee accrual when fee amount is provided
 */
export async function buildOrderJournalEntry(
  input: OrderJournalInput
): Promise<CreateJournalEntryInput> {
  const { order, orderId } = input;
  const tenantId = order.tenantId ?? DEFAULT_TENANT_ID;
  const paidAt = order.paidAt ?? order.financialLockedAt ?? new Date().toISOString();
  const period = accountingPeriodFromIso(paidAt);

  const subtotal = roundMoney(order.subtotal);
  const tax = roundMoney(order.tax ?? 0);
  const shipping = roundMoney(order.shipping ?? 0);
  const discount = roundMoney(order.discountTotal ?? 0);
  const total = roundMoney(order.total);
  const netProductRevenue = roundMoney(Math.max(0, subtotal - discount));
  const merchantFee = roundMoney(input.merchantFeeAmount ?? 0);

  const { totalCogs } = await resolveLineCogs(order.items);

  const lines: LedgerLine[] = [];

  if (total > 0) {
    lines.push({
      account: 'cash',
      type: 'debit',
      amount: total,
      memo: `Order ${orderId} cash receipt`,
    });
  }

  if (netProductRevenue > 0) {
    lines.push({
      account: 'revenue',
      type: 'credit',
      amount: netProductRevenue,
      memo: `Product revenue — order ${orderId}`,
    });
  }

  if (tax > 0) {
    lines.push({
      account: 'tax_payable',
      type: 'credit',
      amount: tax,
      memo: `Sales tax payable — order ${orderId}`,
    });
  }

  if (shipping > 0) {
    lines.push({
      account: 'shipping_revenue',
      type: 'credit',
      amount: shipping,
      memo: `Shipping revenue — order ${orderId}`,
    });
  }

  if (totalCogs > 0) {
    lines.push(
      {
        account: 'cogs',
        type: 'debit',
        amount: totalCogs,
        memo: `COGS — order ${orderId}`,
      },
      {
        account: 'inventory',
        type: 'credit',
        amount: totalCogs,
        memo: `Inventory relief — order ${orderId}`,
      }
    );
  }

  if (merchantFee > 0) {
    lines.push(
      {
        account: 'merchant_fees',
        type: 'debit',
        amount: merchantFee,
        memo: `Processing fees — order ${orderId}`,
      },
      {
        account: 'cash',
        type: 'credit',
        amount: merchantFee,
        memo: `Net fee deduction — order ${orderId}`,
      }
    );
  }

  const summary = assertBalancedLines(lines);

  return {
    orderId,
    tenantId,
    entryType: 'order_cleared',
    period,
    lines,
    totalDebits: summary.totalDebits,
    totalCredits: summary.totalCredits,
    currency: 'USD',
    createdAt: new Date().toISOString(),
  };
}

/** Persists immutable journal entry for a paid order (idempotent per orderId). */
export async function recordOrderJournalEntry(orderId: string): Promise<string | null> {
  if (!isAdminSdkConfigured()) {
    return null;
  }

  const db = getAdminFirestore();
  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (!orderSnap.exists) {
    throw new Error(`Order ${orderId} not found for journaling`);
  }

  const order = orderSnap.data() as OrderDoc & { journalEntryId?: string };
  if (order.journalEntryId) {
    return order.journalEntryId;
  }

  const payload = await buildOrderJournalEntry({ orderId, order });
  const { id } = await appendJournalEntry(payload);

  await db.collection('orders').doc(orderId).set({ journalEntryId: id }, { merge: true });

  return id;
}

export { LedgerBalanceError };
