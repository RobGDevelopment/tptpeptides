import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import {
  institutionVerificationSchema,
  type InstitutionVerification,
  type VerificationStatus,
} from '../schemas/verification';
import { getAdminFirestore } from './admin';

const COLLECTION = 'institutionVerifications';

export function verificationDocId(userId: string): string {
  return userId;
}

export async function getVerificationByUserId(
  userId: string
): Promise<InstitutionVerification | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTION).doc(userId).get();
  if (!snap.exists) return null;

  const parsed = institutionVerificationSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}

export async function saveVerificationRequest(
  verification: InstitutionVerification
): Promise<void> {
  const db = getAdminFirestore();
  const validated = institutionVerificationSchema.parse(verification);
  await db.collection(COLLECTION).doc(verification.userId).set(validated);
}

export async function listVerificationsByStatus(
  status: VerificationStatus
): Promise<(InstitutionVerification & { id: string })[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .where('status', '==', status)
    .orderBy('submittedAt', 'desc')
    .get();

  return snapshot.docs
    .map((doc) => {
      const parsed = institutionVerificationSchema.safeParse(doc.data());
      return parsed.success ? { ...parsed.data, id: doc.id } : null;
    })
    .filter((row): row is InstitutionVerification & { id: string } => row != null);
}

export async function approveVerification(params: {
  userId: string;
  reviewedBy: string;
  institutionTier?: 'Bronze' | 'Silver' | 'Gold';
  taxExempt?: boolean;
}): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(params.userId);
  const userRef = db.collection('users').doc(params.userId);
  const now = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) {
      throw new Error('Verification request not found');
    }

    transaction.update(ref, {
      status: 'approved',
      reviewedAt: now,
      reviewedBy: params.reviewedBy,
      rejectionReason: FieldValue.delete(),
    });

    transaction.set(
      userRef,
      {
        institutionVerified: true,
        institutionTier: params.institutionTier ?? 'Bronze',
        taxExempt: params.taxExempt === true,
        verifiedAt: now,
      },
      { merge: true }
    );
  });
}

export async function rejectVerification(params: {
  userId: string;
  reviewedBy: string;
  rejectionReason?: string;
}): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(params.userId);
  const now = new Date().toISOString();

  await ref.update({
    status: 'rejected',
    reviewedAt: now,
    reviewedBy: params.reviewedBy,
    rejectionReason: params.rejectionReason?.trim() || 'Documentation did not meet requirements.',
  });
}
