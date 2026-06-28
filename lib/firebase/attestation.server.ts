import 'server-only';

import { randomUUID } from 'crypto';
import {
  attestationLogSchema,
  attestationSignatureMatches,
  createAttestationLogInputSchema,
  type AttestationLog,
  type CreateAttestationLogInput,
} from '../schemas/attestation';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const COLLECTION = 'attestation_logs';

export class AttestationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttestationValidationError';
  }
}

export async function createAttestationLog(
  input: CreateAttestationLogInput
): Promise<{ id: string; log: AttestationLog }> {
  const parsed = createAttestationLogInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AttestationValidationError(
      parsed.error.issues[0]?.message ?? 'Invalid attestation payload'
    );
  }

  if (!attestationSignatureMatches(parsed.data.requiredPhrase, parsed.data.typedSignature)) {
    throw new AttestationValidationError('Typed signature does not match the required phrase.');
  }

  if (!isAdminSdkConfigured()) {
    throw new Error('Firebase Admin SDK is not configured');
  }

  const id = randomUUID();
  const log = attestationLogSchema.parse({
    ...parsed.data,
    createdAt: new Date().toISOString(),
  });

  await getAdminFirestore().collection(COLLECTION).doc(id).set(log);

  return { id, log };
}

export async function getAttestationLog(attestationLogId: string): Promise<AttestationLog | null> {
  if (!isAdminSdkConfigured()) {
    return null;
  }

  const snap = await getAdminFirestore().collection(COLLECTION).doc(attestationLogId).get();
  if (!snap.exists) return null;

  const parsed = attestationLogSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}

/** Ensures an attestation log exists, matches tenant/user, and has not been consumed. */
export async function assertAttestationLogEligibleForCheckout(
  attestationLogId: string,
  params: { tenantId: string; uid: string | null }
): Promise<AttestationLog> {
  const log = await getAttestationLog(attestationLogId);
  if (!log) {
    throw new AttestationValidationError('Attestation log not found.');
  }

  if (log.tenantId !== params.tenantId) {
    throw new AttestationValidationError('Attestation does not match this storefront tenant.');
  }

  if (params.uid != null && log.uid != null && log.uid !== params.uid) {
    throw new AttestationValidationError('Attestation was created under a different account.');
  }

  const db = getAdminFirestore();
  const consumed = await db
    .collection('orders')
    .where('attestationLogId', '==', attestationLogId)
    .limit(1)
    .get();

  if (!consumed.empty) {
    throw new AttestationValidationError('This attestation has already been used for an order.');
  }

  return log;
}
