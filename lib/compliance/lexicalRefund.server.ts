import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type { PaymentProviderId } from '../payments/types';
import { createPaymentProvider } from '../payments/resolveProvider.server';
import { createOpsException } from '../firebase/exceptions.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import type { OrderDoc } from '../schemas/order';

const REFUNDABLE_STATUSES = ['paid', 'processing'] as const;

function resolveProviderId(order: OrderDoc & { paymentProviderId?: string }): PaymentProviderId {
  const explicit = order.paymentProviderId?.trim();
  if (
    explicit === 'stripe' ||
    explicit === 'authorizenet' ||
    explicit === 'nmi' ||
    explicit === 'seamlesschex' ||
    explicit === 'payram'
  ) {
    return explicit;
  }
  return order.stripePaymentIntentId ? 'stripe' : 'authorizenet';
}

function resolveTransactionId(order: OrderDoc): string | null {
  if (order.stripePaymentIntentId?.trim()) {
    return order.stripePaymentIntentId.trim();
  }
  if (order.providerTransactionId?.trim()) {
    return order.providerTransactionId.trim();
  }
  return null;
}

async function refundOrder(orderId: string, order: OrderDoc, reason: string): Promise<boolean> {
  const transactionId = resolveTransactionId(order);
  if (!transactionId) {
    return false;
  }

  const providerId = resolveProviderId(order);
  const provider = createPaymentProvider(providerId);

  const result = await provider.refundCharge({
    transactionId,
    reason,
    idempotencyKey: `lexical-refund-${orderId}`,
  });

  if (result.status === 'failed') {
    return false;
  }

  await getAdminFirestore()
    .collection('orders')
    .doc(orderId)
    .set(
      {
        status: 'cancelled',
        complianceRefundAt: new Date().toISOString(),
        complianceRefundReason: reason,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return true;
}

async function findRefundableOrders(input: {
  userId?: string | null;
  email?: string;
}): Promise<Array<{ id: string; order: OrderDoc }>> {
  const db = getAdminFirestore();
  const results: Array<{ id: string; order: OrderDoc }> = [];

  if (input.userId) {
    const snap = await db
      .collection('orders')
      .where('userId', '==', input.userId)
      .where('status', 'in', [...REFUNDABLE_STATUSES])
      .limit(10)
      .get();

    for (const doc of snap.docs) {
      results.push({ id: doc.id, order: doc.data() as OrderDoc });
    }
  }

  const email = input.email?.trim().toLowerCase();
  if (email) {
    const guestSnap = await db
      .collection('orders')
      .where('guestEmail', '==', email)
      .where('status', 'in', [...REFUNDABLE_STATUSES])
      .limit(10)
      .get();

    for (const doc of guestSnap.docs) {
      if (!results.some((row) => row.id === doc.id)) {
        results.push({ id: doc.id, order: doc.data() as OrderDoc });
      }
    }
  }

  return results;
}

export async function resolveUserIdFromEmail(email: string): Promise<string | null> {
  if (!isAdminSdkConfigured()) return null;

  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const snap = await getAdminFirestore()
    .collection('users')
    .where('email', '==', normalized)
    .limit(1)
    .get();

  return snap.empty ? null : snap.docs[0]!.id;
}

/** Refunds recent cleared orders when lexical quarantine severity is high. */
export async function refundOrdersForLexicalQuarantine(input: {
  userId?: string | null;
  fromEmail: string;
  reason: string;
}): Promise<{ refundedOrderIds: string[]; failedOrderIds: string[] }> {
  if (!isAdminSdkConfigured()) {
    return { refundedOrderIds: [], failedOrderIds: [] };
  }

  const userId = input.userId ?? (await resolveUserIdFromEmail(input.fromEmail));
  const orders = await findRefundableOrders({ userId, email: input.fromEmail });

  const refundedOrderIds: string[] = [];
  const failedOrderIds: string[] = [];

  for (const { id, order } of orders) {
    try {
      const ok = await refundOrder(id, order, input.reason);
      if (ok) refundedOrderIds.push(id);
      else failedOrderIds.push(id);
    } catch (error) {
      console.error('[lexical-refund] failed', id, error);
      failedOrderIds.push(id);
    }
  }

  if (failedOrderIds.length > 0) {
    await createOpsException({
      type: 'lexical_quarantine',
      message: `Lexical quarantine refund failures for ${input.fromEmail}: ${failedOrderIds.join(', ')}`,
      metadata: {
        fromEmail: input.fromEmail,
        failedOrderIds: failedOrderIds.join(','),
      },
    });
  }

  return { refundedOrderIds, failedOrderIds };
}
