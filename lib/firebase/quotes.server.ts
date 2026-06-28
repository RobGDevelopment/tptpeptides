import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AdminQuoteCreate, QuoteDocument, QuoteLineItem, QuoteStatus } from '../schemas/quote';
import { quoteDocumentSchema } from '../schemas/quote';
import { estimateShipping } from '../shipping/estimate';
import { validateAndPriceCart } from './orders.server';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

function serializeQuoteDoc(
  id: string,
  data: FirebaseFirestore.DocumentData
): (QuoteDocument & { id: string }) | null {
  const normalized = {
    ...data,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt,
  };
  const parsed = quoteDocumentSchema.safeParse(normalized);
  return parsed.success ? { id, ...parsed.data } : null;
}

function formatQuoteNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `Q-${year}-${String(sequence).padStart(4, '0')}`;
}

async function nextQuoteNumber(): Promise<string> {
  const db = getAdminFirestore();
  const year = new Date().getFullYear();
  const counterRef = db.collection('counters').doc(`quotes-${year}`);

  const quoteNumber = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);
    const next = (snap.exists ? Number(snap.data()?.value ?? 0) : 0) + 1;
    transaction.set(counterRef, { value: next }, { merge: true });
    return formatQuoteNumber(next);
  });

  return quoteNumber;
}

export async function listQuotes(limit = 50): Promise<(QuoteDocument & { id: string })[]> {
  if (!isAdminSdkConfigured()) return [];

  const db = getAdminFirestore();
  const snapshot = await db
    .collection('quotes')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => serializeQuoteDoc(doc.id, doc.data()))
    .filter((row): row is QuoteDocument & { id: string } => row != null);
}

export async function getQuoteById(quoteId: string): Promise<(QuoteDocument & { id: string }) | null> {
  if (!isAdminSdkConfigured()) return null;

  const db = getAdminFirestore();
  const snap = await db.collection('quotes').doc(quoteId).get();
  if (!snap.exists) return null;

  return serializeQuoteDoc(snap.id, snap.data()!);
}

export async function createQuote(
  input: AdminQuoteCreate,
  createdBy: string
): Promise<{ id: string; quote: QuoteDocument }> {
  const cart = await validateAndPriceCart(
    input.items.map((item) => ({ id: item.productId, quantity: item.quantity })),
    { userId: input.customerUserId ?? null }
  );
  const shipping = estimateShipping(cart.items.length);
  const subtotal = cart.total;
  const total = subtotal + shipping;

  const lineItems: QuoteLineItem[] = cart.items.map((item) => ({
    productId: item.id,
    name: item.name,
    tag: item.tag,
    quantity: item.quantity,
    unitPrice: item.price,
  }));

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + input.validDays);

  const quoteNumber = await nextQuoteNumber();
  const quote: QuoteDocument = {
    quoteNumber,
    status: 'draft',
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    institutionName: input.institutionName,
    customerUserId: input.customerUserId ?? null,
    lineItems,
    subtotal,
    shipping,
    tax: 0,
    total,
    validUntil: validUntil.toISOString(),
    notes: input.notes,
    createdBy,
    sentAt: null,
  };

  const validated = quoteDocumentSchema.parse(quote);
  const db = getAdminFirestore();
  const docRef = await db.collection('quotes').add({
    ...validated,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id, quote: validated };
}

export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus
): Promise<QuoteDocument | null> {
  const db = getAdminFirestore();
  const ref = db.collection('quotes').doc(quoteId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const patch: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (status === 'sent') {
    patch.sentAt = new Date().toISOString();
  }

  await ref.update(patch);

  const updated = await ref.get();
  return updated.exists ? serializeQuoteDoc(updated.id, updated.data()!) : null;
}
