import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AdminBatchCreate, BatchDocument, BatchStatus } from '../schemas/batch';
import { batchDocumentSchema } from '../schemas/batch';
import { productDocSchema } from '../schemas/product';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

function serializeBatch(id: string, data: FirebaseFirestore.DocumentData): (BatchDocument & { id: string }) | null {
  const normalized = {
    ...data,
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  };
  const parsed = batchDocumentSchema.safeParse(normalized);
  return parsed.success ? { id, ...parsed.data } : null;
}

export async function listBatches(limit = 100): Promise<(BatchDocument & { id: string })[]> {
  if (!isAdminSdkConfigured()) return [];

  const db = getAdminFirestore();
  const snapshot = await db.collection('batches').orderBy('receivedAt', 'desc').limit(limit).get();

  return snapshot.docs
    .map((doc) => serializeBatch(doc.id, doc.data()))
    .filter((row): row is BatchDocument & { id: string } => row != null);
}

export async function getBatchById(batchId: string): Promise<(BatchDocument & { id: string }) | null> {
  if (!isAdminSdkConfigured()) return null;

  const db = getAdminFirestore();
  const snap = await db.collection('batches').doc(batchId).get();
  if (!snap.exists) return null;
  return serializeBatch(snap.id, snap.data()!);
}

export async function createBatch(
  input: AdminBatchCreate,
  createdBy: string
): Promise<{ id: string; batch: BatchDocument }> {
  const db = getAdminFirestore();
  const productSnap = await db.collection('products').doc(input.productId).get();
  if (!productSnap.exists) {
    throw new Error(`Product ${input.productId} not found`);
  }

  const product = productDocSchema.parse(productSnap.data());
  const receivedAt = input.receivedAt ?? new Date().toISOString();

  const batch: BatchDocument = {
    lotNumber: input.lotNumber.trim(),
    productId: input.productId,
    productName: product.name,
    productTag: product.tag,
    quantityReceived: input.quantityReceived,
    quantityAvailable: input.quantityReceived,
    purity: input.purity ?? product.purity,
    coaUrl: input.coaUrl,
    status: 'active',
    receivedAt,
    notes: input.notes,
    createdBy,
  };

  const validated = batchDocumentSchema.parse(batch);
  const docRef = await db.collection('batches').add({
    ...validated,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id, batch: validated };
}

export async function assignBatchesToOrder(params: {
  orderId: string;
  assignments: { productId: string; batchId: string }[];
}): Promise<void> {
  const db = getAdminFirestore();
  const orderRef = db.collection('orders').doc(params.orderId);

  await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      throw new Error('Order not found');
    }

    const order = orderSnap.data()!;
    const items = (order.items as Record<string, unknown>[]) ?? [];
    const assignmentMap = new Map(params.assignments.map((row) => [row.productId, row.batchId]));

    const updatedItems = [];
    for (const item of items) {
      const productId = String(item.id ?? '');
      const batchId = assignmentMap.get(productId);
      if (!batchId) {
        updatedItems.push(item);
        continue;
      }

      const batchRef = db.collection('batches').doc(batchId);
      const batchSnap = await transaction.get(batchRef);
      if (!batchSnap.exists) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const batch = batchDocumentSchema.parse(batchSnap.data());
      const quantity = Number(item.quantity ?? 1);
      if (batch.quantityAvailable < quantity) {
        throw new Error(`Insufficient batch quantity for lot ${batch.lotNumber}`);
      }

      const nextAvailable = batch.quantityAvailable - quantity;
      transaction.update(batchRef, {
        quantityAvailable: nextAvailable,
        status: nextAvailable <= 0 ? 'depleted' : batch.status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      updatedItems.push({
        ...item,
        batchId,
        lotNumber: batch.lotNumber,
        coaUrl: batch.coaUrl ?? null,
        purity: batch.purity ?? item.purity,
      });
    }

    transaction.update(orderRef, {
      items: updatedItems,
      batchAssignedAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function listActiveBatchesForProduct(
  productId: string
): Promise<(BatchDocument & { id: string })[]> {
  if (!isAdminSdkConfigured()) return [];

  const db = getAdminFirestore();
  const snapshot = await db.collection('batches').where('productId', '==', productId).get();

  return snapshot.docs
    .map((doc) => serializeBatch(doc.id, doc.data()))
    .filter(
      (row): row is BatchDocument & { id: string } =>
        row != null && row.status === 'active' && row.quantityAvailable > 0
    )
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
}

export async function updateBatchStatus(batchId: string, status: BatchStatus): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('batches').doc(batchId).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
