import 'server-only';

import { randomBytes } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { CartSnapshotItem } from '../schemas/growth';
import { cartSnapshotSchema } from '../schemas/growth';
import { ABANDONED_CART_IDLE_MS } from '../schemas/growth';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

function serializeSnapshot(
  id: string,
  data: FirebaseFirestore.DocumentData
): (ReturnType<typeof cartSnapshotSchema.parse> & { id: string }) | null {
  const normalized = {
    ...data,
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt,
    emailSentAt:
      data.emailSentAt instanceof Timestamp
        ? data.emailSentAt.toDate().toISOString()
        : data.emailSentAt,
  };
  const parsed = cartSnapshotSchema.safeParse(normalized);
  return parsed.success ? { id, ...parsed.data } : null;
}

export async function upsertCartSnapshot(params: {
  userId: string | null;
  email: string;
  items: CartSnapshotItem[];
}): Promise<void> {
  if (!isAdminSdkConfigured()) return;

  const db = getAdminFirestore();
  const subtotal = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let docRef = db.collection('cartSnapshots').doc();
  if (params.userId) {
    const existing = await db
      .collection('cartSnapshots')
      .where('userId', '==', params.userId)
      .where('convertedAt', '==', null)
      .limit(1)
      .get();
    if (!existing.empty) {
      docRef = existing.docs[0]!.ref;
    }
  }

  const existingSnap = await docRef.get();
  const recoveryToken = existingSnap.exists
    ? String(existingSnap.data()?.recoveryToken ?? randomBytes(24).toString('hex'))
    : randomBytes(24).toString('hex');

  await docRef.set(
    {
      userId: params.userId,
      email: params.email.toLowerCase(),
      items: params.items,
      subtotal,
      recoveryToken,
      updatedAt: FieldValue.serverTimestamp(),
      emailSentAt: existingSnap.data()?.emailSentAt ?? null,
      recoveredAt: null,
      convertedAt: null,
    },
    { merge: true }
  );
}

export async function getCartSnapshotByToken(token: string) {
  if (!isAdminSdkConfigured()) return null;

  const db = getAdminFirestore();
  const snapshot = await db
    .collection('cartSnapshots')
    .where('recoveryToken', '==', token)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  return serializeSnapshot(doc.id, doc.data());
}

export async function markCartSnapshotRecovered(snapshotId: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('cartSnapshots').doc(snapshotId).update({
    recoveredAt: new Date().toISOString(),
  });
}

export async function markCartSnapshotConverted(userId: string | null, email: string): Promise<void> {
  if (!isAdminSdkConfigured()) return;
  const db = getAdminFirestore();

  let query = db.collection('cartSnapshots').where('convertedAt', '==', null);
  if (userId) {
    query = query.where('userId', '==', userId);
  } else {
    query = query.where('email', '==', email.toLowerCase());
  }

  const snapshot = await query.limit(5).get();
  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.update(doc.ref, { convertedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
}

export async function listAbandonedCartCandidates(limit = 50) {
  if (!isAdminSdkConfigured()) return [];

  const db = getAdminFirestore();
  const snapshot = await db.collection('cartSnapshots').orderBy('updatedAt', 'desc').limit(200).get();
  const cutoffMs = Date.now() - ABANDONED_CART_IDLE_MS;

  return snapshot.docs
    .map((doc) => serializeSnapshot(doc.id, doc.data()))
    .filter((row): row is NonNullable<typeof row> => row != null)
    .filter((row) => !row.convertedAt && !row.emailSentAt)
    .filter((row) => new Date(row.updatedAt).getTime() <= cutoffMs)
    .slice(0, limit);
}

export async function markAbandonedCartEmailSent(snapshotId: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('cartSnapshots').doc(snapshotId).update({
    emailSentAt: FieldValue.serverTimestamp(),
  });
}

export async function countActiveCartSnapshots(): Promise<number> {
  if (!isAdminSdkConfigured()) return 0;
  const db = getAdminFirestore();
  const snapshot = await db.collection('cartSnapshots').where('convertedAt', '==', null).limit(200).get();
  return snapshot.size;
}
