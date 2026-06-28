import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
import type { CartItem } from '../../features/storefront/types';
import { calculatePointsForPurchase } from '../business/loyalty';
import { productDocSchema } from '../schemas/product';
import { getModuleFlags } from './modules.server';
import { getPriceListForTier, getUserPricingTier, resolveTierUnitPrice } from './pricing.server';
import { isB2BFeatureEnabled } from '../modules/b2b.server';
import { isProductVisibleToTenant } from '../tenant/productVisibility';
import { getActiveTenantId } from '../tenant/getTenant.server';
import { DEFAULT_TENANT_ID } from '../tenant/constants';
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
  requestedItems: { id: string; quantity: number }[],
  options?: { userId?: string | null; tenantId?: string }
): Promise<ValidatedCart> {
  if (!isAdminSdkConfigured()) {
    throw new CheckoutValidationError('Checkout is unavailable — database not configured');
  }

  const db = getAdminFirestore();
  const flags = await getModuleFlags();
  const tenantId = options?.tenantId ?? (await getActiveTenantId());

  let pricingTier: Awaited<ReturnType<typeof getUserPricingTier>>['tier'] = null;
  if (options?.userId && isB2BFeatureEnabled(flags, 'isTieredPricingEnabled')) {
    const userPricing = await getUserPricingTier(options.userId);
    if (userPricing.institutionVerified && userPricing.tier) {
      pricingTier = userPricing.tier;
    }
  }

  const priceList = pricingTier ? await getPriceListForTier(pricingTier) : null;

  const uniqueIds = [...new Set(requestedItems.map((item) => item.id))];
  const productRefs = uniqueIds.map((id) => db.collection('products').doc(id));
  const snapshots = await db.getAll(...productRefs);

  const productMap = new Map<string, ReturnType<typeof productDocSchema.parse>>();
  for (const snap of snapshots) {
    if (!snap.exists) continue;
    const parsed = productDocSchema.safeParse(snap.data());
    if (parsed.success && parsed.data.active) {
      if (!isProductVisibleToTenant(parsed.data.tenantVisibility, tenantId)) continue;
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

    const unitPrice =
      priceList != null
        ? resolveTierUnitPrice(requested.id, product.price, priceList)
        : product.price;

    pricedItems.push({
      id: requested.id,
      slug: product.catalogId ?? requested.id,
      name: product.name,
      tag: product.tag,
      price: unitPrice,
      unitPrice,
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
  subtotal: number;
  shipping: number;
  tax?: number;
  discountTotal?: number;
  total: number;
  userId: string | null;
  guestEmail: string | null;
  stripeSessionId?: string | null;
  stripeInvoiceId?: string | null;
  paymentMethod?: 'stripe_checkout' | 'stripe_invoice';
  status?: 'pending_payment' | 'pending_invoice';
  poNumber?: string | null;
  quoteId?: string | null;
  pointsRedeemed?: number;
  loyaltyDiscount?: number;
  ruoAttestationTimestamp: string;
  ipAddress: string;
  tenantId?: string;
  attestationLogId?: string;
}): Promise<string> {
  const db = getAdminFirestore();
  const docRef = params.orderId ? db.collection('orders').doc(params.orderId) : db.collection('orders').doc();
  const tenantId = params.tenantId ?? DEFAULT_TENANT_ID;

  const tax = params.tax ?? 0;
  const discountTotal = params.discountTotal ?? 0;
  const paymentMethod = params.paymentMethod ?? 'stripe_checkout';
  const status = params.status ?? 'pending_payment';

  await docRef.set({
    userId: params.userId,
    guestEmail: params.guestEmail,
    poNumber: params.poNumber ?? null,
    quoteId: params.quoteId ?? null,
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
    subtotal: params.subtotal,
    tax,
    shipping: params.shipping,
    discountTotal,
    total: params.total,
    pointsRedeemed: params.pointsRedeemed ?? 0,
    loyaltyDiscount: params.loyaltyDiscount ?? 0,
    paymentMethod,
    status,
    stripeSessionId: params.stripeSessionId ?? null,
    stripeInvoiceId: params.stripeInvoiceId ?? null,
    stripePaymentIntentId: null,
    ruoAttestationTimestamp: params.ruoAttestationTimestamp,
    ipAddress: params.ipAddress,
    tenantId,
    ...(params.attestationLogId ? { attestationLogId: params.attestationLogId } : {}),
    loyaltyPointsAwarded: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export interface StripeFulfillmentSnapshot {
  paymentIntentId: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  discountTotal: number;
  total: number;
}

export function buildStripeFulfillmentSnapshot(session: Stripe.Checkout.Session): StripeFulfillmentSnapshot {
  const totalDetails = session.total_details;
  return {
    paymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    subtotal: (session.amount_subtotal ?? 0) / 100,
    tax: (totalDetails?.amount_tax ?? 0) / 100,
    shipping: (totalDetails?.amount_shipping ?? 0) / 100,
    discountTotal: (totalDetails?.amount_discount ?? 0) / 100,
    total: (session.amount_total ?? 0) / 100,
  };
}

export async function fulfillPaidOrder(
  orderId: string,
  stripeSnapshot?: StripeFulfillmentSnapshot
): Promise<{
  orderId: string;
  loyaltyPointsAwarded: number;
  alreadyFulfilled: boolean;
}> {
  const db = getAdminFirestore();
  const orderRef = db.collection('orders').doc(orderId);

  const result = await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderSnap.data()!;
    if (order.status === 'paid' || order.status === 'fulfilled' || order.status === 'processing') {
      return {
        orderId,
        loyaltyPointsAwarded: order.loyaltyPointsAwarded ?? 0,
        alreadyFulfilled: true,
      };
    }

    if (order.status !== 'pending_payment' && order.status !== 'pending_invoice') {
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

    const orderTotal = stripeSnapshot?.total ?? Number(order.total);
    const pointsRedeemed = Number(order.pointsRedeemed ?? 0);
    const loyaltyPointsEarned = order.userId ? calculatePointsForPurchase(orderTotal) : 0;
    const loyaltyPointsNet = loyaltyPointsEarned - pointsRedeemed;

    if (order.userId && loyaltyPointsNet !== 0) {
      const userRef = db.collection('users').doc(order.userId);
      transaction.set(
        userRef,
        {
          loyaltyPoints: FieldValue.increment(loyaltyPointsNet),
          totalPointsEarned: FieldValue.increment(Math.max(loyaltyPointsEarned, 0)),
        },
        { merge: true }
      );
    }

    const financialUpdate: Record<string, unknown> = {
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      loyaltyPointsAwarded: loyaltyPointsEarned,
      financialLockedAt: new Date().toISOString(),
    };

    if (stripeSnapshot) {
      financialUpdate.subtotal = stripeSnapshot.subtotal;
      financialUpdate.tax = stripeSnapshot.tax;
      financialUpdate.shipping = stripeSnapshot.shipping;
      financialUpdate.discountTotal = stripeSnapshot.discountTotal;
      financialUpdate.total = stripeSnapshot.total;
      financialUpdate.stripePaymentIntentId = stripeSnapshot.paymentIntentId;
    }

    transaction.update(orderRef, financialUpdate);

    return { orderId, loyaltyPointsAwarded: loyaltyPointsEarned, alreadyFulfilled: false };
  });

  if (!result.alreadyFulfilled) {
    try {
      const { recordOrderJournalEntry } = await import('../finance/journaling.server');
      await recordOrderJournalEntry(orderId);
    } catch (error) {
      console.error('[ledger] automatic journaling failed', orderId, error);
    }
  }

  return result;
}

export interface StoredOrder {
  id: string;
  userId: string | null;
  guestEmail?: string | null;
  total: number;
  status: string;
  loyaltyPointsAwarded?: number;
}

export async function getOrderByStripeInvoiceId(
  stripeInvoiceId: string
): Promise<StoredOrder | null> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('orders')
    .where('stripeInvoiceId', '==', stripeInvoiceId)
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

export async function listOrdersForExport(params: {
  startDate: string;
  endDate: string;
}): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const db = getAdminFirestore();
  const start = Timestamp.fromDate(new Date(params.startDate));
  const end = Timestamp.fromDate(new Date(`${params.endDate}T23:59:59.999Z`));

  const snapshot = await db
    .collection('orders')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }));
}
