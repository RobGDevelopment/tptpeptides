import 'server-only';

import { randomUUID } from 'crypto';
import {
  assertBalancedLines,
  createJournalEntryInputSchema,
  journalEntrySchema,
  type CreateJournalEntryInput,
  type JournalEntry,
} from '../schemas/ledger';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

const COLLECTION = 'journal_entries';

export class LedgerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerValidationError';
  }
}

export class LedgerBalanceError extends LedgerValidationError {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerBalanceError';
  }
}

/** Server-only append — Firestore client rules deny all writes. */
export async function appendJournalEntry(
  input: CreateJournalEntryInput
): Promise<{ id: string; entry: JournalEntry }> {
  assertBalancedLines(input.lines);

  const parsed = createJournalEntryInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new LedgerValidationError(
      parsed.error.issues[0]?.message ?? 'Invalid journal entry payload'
    );
  }

  if (!isAdminSdkConfigured()) {
    throw new Error('Firebase Admin SDK is not configured');
  }

  const db = getAdminFirestore();

  const existing = await db
    .collection(COLLECTION)
    .where('orderId', '==', parsed.data.orderId)
    .where('entryType', '==', parsed.data.entryType)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0]!;
    const entry = journalEntrySchema.parse(doc.data());
    return { id: doc.id, entry };
  }

  const id = randomUUID();
  const entry = journalEntrySchema.parse({
    ...parsed.data,
    syncedToQbo: false,
  });

  await db.collection(COLLECTION).doc(id).set(entry);

  return { id, entry };
}

export async function listJournalEntriesForPeriod(period: string): Promise<
  Array<{ id: string; entry: JournalEntry }>
> {
  if (!isAdminSdkConfigured()) {
    return [];
  }

  const snap = await getAdminFirestore()
    .collection(COLLECTION)
    .where('period', '==', period)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    entry: journalEntrySchema.parse(doc.data()),
  }));
}

/** Recent immutable journal entries for admin ledger UI (newest first). */
export async function listRecentJournalEntries(limit = 100): Promise<
  Array<{ id: string; entry: JournalEntry }>
> {
  if (!isAdminSdkConfigured()) {
    return [];
  }

  const snap = await getAdminFirestore()
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    entry: journalEntrySchema.parse(doc.data()),
  }));
}

export async function markJournalEntriesSyncedToQbo(
  entryIds: string[],
  qboSyncId: string
): Promise<void> {
  if (!isAdminSdkConfigured() || entryIds.length === 0) return;

  const db = getAdminFirestore();
  const batch = db.batch();
  const syncedAt = new Date().toISOString();

  for (const entryId of entryIds) {
    batch.update(db.collection(COLLECTION).doc(entryId), {
      syncedToQbo: true,
      qboSyncId,
      syncedAt,
    });
  }

  await batch.commit();
}
