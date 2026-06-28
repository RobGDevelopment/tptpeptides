import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type { OpsExceptionDoc, OpsExceptionType } from '../schemas/opsException';
import { opsExceptionDocSchema } from '../schemas/opsException';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const COLLECTION = 'ops_exceptions';

export async function createOpsException(input: {
  type: OpsExceptionType;
  message: string;
  orderId?: string;
  metadata?: Record<string, string>;
  tenantId?: string;
}): Promise<string> {
  if (!isAdminSdkConfigured()) {
    throw new Error('Firebase Admin SDK is not configured');
  }

  const doc = opsExceptionDocSchema.parse({
    type: input.type,
    status: 'open',
    orderId: input.orderId,
    message: input.message,
    metadata: input.metadata,
    tenantId: input.tenantId,
    createdAt: new Date().toISOString(),
  });

  const ref = await getAdminFirestore().collection(COLLECTION).add(doc);
  return ref.id;
}

export async function listOpenOpsExceptions(limit = 50): Promise<Array<{ id: string } & OpsExceptionDoc>> {
  if (!isAdminSdkConfigured()) {
    return [];
  }

  const snap = await getAdminFirestore()
    .collection(COLLECTION)
    .where('status', '==', 'open')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as OpsExceptionDoc) }));
}

export async function resolveOpsException(exceptionId: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTION).doc(exceptionId).update({
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getOpsException(
  exceptionId: string
): Promise<({ id: string } & OpsExceptionDoc) | null> {
  if (!isAdminSdkConfigured()) return null;

  const snap = await getAdminFirestore().collection(COLLECTION).doc(exceptionId).get();
  if (!snap.exists) return null;

  return { id: snap.id, ...(snap.data() as OpsExceptionDoc) };
}
