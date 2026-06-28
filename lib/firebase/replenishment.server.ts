import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';
import type { ReplenishmentCandidate } from '../schemas/growth';
import { REPLENISHMENT_MAX_DAYS, REPLENISHMENT_MIN_DAYS } from '../schemas/growth';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const FULFILLED_STATUSES = new Set(['paid', 'processing', 'fulfilled']);

export async function findReplenishmentCandidates(limit = 50): Promise<ReplenishmentCandidate[]> {
  if (!isAdminSdkConfigured()) return [];

  const db = getAdminFirestore();
  const ordersSnap = await db.collection('orders').limit(400).get();
  const usersSnap = await db.collection('users').limit(400).get();

  const userEmails = new Map<string, string>();
  for (const doc of usersSnap.docs) {
    const email = doc.data().email as string | undefined;
    if (email) userEmails.set(doc.id, email);
  }

  const lastOrderByUserProduct = new Map<
    string,
    { date: Date; quantity: number; name: string; tag: string; productId: string; userId: string }
  >();

  for (const orderDoc of ordersSnap.docs) {
    const order = orderDoc.data();
    const status = String(order.status ?? '');
    if (!FULFILLED_STATUSES.has(status)) continue;

    const userId = order.userId as string | null | undefined;
    if (!userId) continue;

    const createdAt = order.createdAt?.toDate?.() as Date | undefined;
    if (!createdAt) continue;

    const items = (order.items as Record<string, unknown>[]) ?? [];
    for (const item of items) {
      const productId = String(item.id ?? '');
      if (!productId || productId === 'shipping') continue;

      const key = `${userId}:${productId}`;
      const existing = lastOrderByUserProduct.get(key);
      if (!existing || createdAt > existing.date) {
        lastOrderByUserProduct.set(key, {
          date: createdAt,
          quantity: Number(item.quantity ?? 1),
          name: String(item.name ?? 'Product'),
          tag: String(item.tag ?? ''),
          productId,
          userId,
        });
      }
    }
  }

  const now = Date.now();
  const candidates: ReplenishmentCandidate[] = [];

  for (const row of lastOrderByUserProduct.values()) {
    const daysSinceOrder = Math.floor((now - row.date.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceOrder < REPLENISHMENT_MIN_DAYS || daysSinceOrder > REPLENISHMENT_MAX_DAYS) {
      continue;
    }

    const email = userEmails.get(row.userId);
    if (!email) continue;

    candidates.push({
      userId: row.userId,
      email,
      productId: row.productId,
      productName: row.name,
      productTag: row.tag,
      lastOrderedAt: row.date.toISOString(),
      daysSinceOrder,
      suggestedQuantity: Math.max(1, row.quantity),
    });
  }

  return candidates
    .sort((a, b) => b.daysSinceOrder - a.daysSinceOrder)
    .slice(0, limit);
}

export async function wasReplenishmentEmailSentRecently(
  userId: string,
  productId: string,
  withinDays = 14
): Promise<boolean> {
  const db = getAdminFirestore();
  const cutoff = Timestamp.fromDate(new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000));
  const snapshot = await db
    .collection('replenishmentEmails')
    .where('userId', '==', userId)
    .where('productId', '==', productId)
    .where('sentAt', '>=', cutoff)
    .limit(1)
    .get();

  return !snapshot.empty;
}

export async function recordReplenishmentEmail(params: {
  userId: string;
  productId: string;
  email: string;
}): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('replenishmentEmails').add({
    ...params,
    sentAt: new Date(),
  });
}
