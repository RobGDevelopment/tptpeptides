import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import type { CartItem } from '../../features/storefront/types';
import { calculatePointsForPurchase } from '../business/loyalty';
import { productDocSchema } from '../schemas/product';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

export interface PricedCartItem extends CartItem {
  unitPrice: number;
}

export interface ValidatedCart {
  items: PricedCartItem[];
  total: number;
}

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}

export async function validateAndPriceCart(
  requestedItems: { id: string; quantity: number }[]
): Promise<ValidatedCart> {
  if (!isAdminSdkConfigured()) {
    throw new CheckoutValidationError('Checkout is unavailable — database not configured');
  }

  const db = getAdminFirestore();
  const uniqueIds = [...new Set(requestedItems.map((item) => item.id))];
  const productRefs = uniqueIds.map((id) => db.collection('products').doc(id));
  const snapshots = await db.getAll(...productRefs);

  const productMap = new Map<string, ReturnType<typeof productDocSchema.parse>>();
  for (const snap of snapshots) {
    if (!snap.exists) continue;
    const parsed = productDocSchema.safeParse(snap.data());
    if (parsed.success && parsed.data.active) {
      productMap.set(snap.id, parsed.data);
    }
  }

  const pricedItems: PricedCartItem[] = [];

  for (const requested of requestedItems) {
    const product = productMap.get(requested.id);
    if (!product) {
      throw new CheckoutValidationError(`Product "${requested.id}" is unavailable`);
    }
    if (product.stock < requested.quantity) {
      throw new CheckoutValidationError(`${product.name} has insufficient stock`);
    }

    pricedItems.push({
      id: requested.id,
      slug: product.catalogId ?? requested.id,
      name: product.name,
      tag: product.tag,
      price: product.price,
      unitPrice: product.price,
      stock: product.stock,
      desc: product.desc,
      purity: product.purity,
      quantity: requested.quantity,
    });
  }

  const total = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (total <= 0) {
    throw new CheckoutValidationError('Cart total must be greater than zero');
  }

  return { items: pricedItems, total };
}

export async function createPendingOrder(params: {
  orderId?: string;
  items: PricedCartItem[];
  total: number;
  userId: string | null;
  guestEmail: string | null;
  stripeSessionId: string;
  poNumber?: string | null;
  shippingEstimate?: number;
}): Promise<string> {
  const db = getAdminFirestore();
  const docRef = params.orderId ? db.collection('orders').doc(params.orderId) : db.collection('orders').doc();

  await docRef.set({
    userId: params.userId,
    guestEmail: params.guestEmail,
    poNumber: params.poNumber ?? null,
    shippingEstimate: params.shippingEstimate ?? null,
    items: params.items.map(({ id, name, tag, price, stock, desc, purity, quantity, slug }) => ({
      id,
      slug,
      name,
      tag,
      price,
      stock,
      desc,
      purity,
      quantity,
    })),
    total: params.total,
    status: 'pending_payment',
    stripeSessionId: params.stripeSessionId,
    loyaltyPointsAwarded: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function fulfillPaidOrder(orderId: string): Promise<{
  orderId: string;
  loyaltyPointsAwarded: number;
  alreadyFulfilled: boolean;
}> {
  const db = getAdminFirestore();
  const orderRef = db.collection('orders').doc(orderId);

  return db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderSnap.data()!;
    if (order.status === 'paid' || order.status === 'fulfilled') {
      return {
        orderId,
        loyaltyPointsAwarded: order.loyaltyPointsAwarded ?? 0,
        alreadyFulfilled: true,
      };
    }

    if (order.status !== 'pending_payment') {
      throw new Error(`Order ${orderId} is not payable (status: ${order.status})`);
    }

    const items = order.items as CartItem[];

    for (const item of items) {
      const productRef = db.collection('products').doc(item.id);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists) {
        throw new Error(`Product ${item.id} not found during fulfillment`);
      }

      const parsed = productDocSchema.safeParse(productSnap.data());
      if (!parsed.success) {
        throw new Error(`Product ${item.id} has invalid data`);
      }

      if (parsed.data.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${parsed.data.name}`);
      }

      transaction.update(productRef, {
        stock: parsed.data.stock - item.quantity,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const loyaltyPoints = order.userId
      ? calculatePointsForPurchase(Number(order.total))
      : 0;

    if (order.userId && loyaltyPoints > 0) {
      const userRef = db.collection('users').doc(order.userId);
      transaction.set(
        userRef,
        {
          loyaltyPoints: FieldValue.increment(loyaltyPoints),
          totalPointsEarned: FieldValue.increment(loyaltyPoints),
        },
        { merge: true }
      );
    }

    transaction.update(orderRef, {
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      loyaltyPointsAwarded: loyaltyPoints,
    });

    return { orderId, loyaltyPointsAwarded: loyaltyPoints, alreadyFulfilled: false };
  });
}

export interface StoredOrder {
  id: string;
  userId: string | null;
  guestEmail?: string | null;
  total: number;
  status: string;
  loyaltyPointsAwarded?: number;
}

export async function getOrderByStripeSessionId(
  stripeSessionId: string
): Promise<StoredOrder | null> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('orders')
    .where('stripeSessionId', '==', stripeSessionId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0]!;
  const data = doc.data();

  return {
    id: doc.id,
    userId: (data.userId as string | null) ?? null,
    guestEmail: (data.guestEmail as string | null | undefined) ?? null,
    total: Number(data.total),
    status: String(data.status),
    loyaltyPointsAwarded: Number(data.loyaltyPointsAwarded ?? 0),
  };
}
