import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

const CITATION_REWARD_POINTS = 25;

const citationSchema = z.object({
  citationUrl: z.string().url().max(500),
  compoundSlug: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  const sessionUser = await getSessionUserFromRequest(request);
  if (!sessionUser?.uid) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isLoyaltyRedemptionEnabled')) {
    return NextResponse.json({ error: 'Research citation rewards are not enabled' }, { status: 404 });
  }

  if (!isAdminSdkConfigured()) {
    return NextResponse.json({ error: 'Rewards are not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = citationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Provide a valid publication URL' }, { status: 400 });
  }

  const db = getAdminFirestore();
  const normalizedUrl = parsed.data.citationUrl.trim();

  const duplicate = await db
    .collection('researchCitations')
    .where('citationUrl', '==', normalizedUrl)
    .limit(1)
    .get();

  if (!duplicate.empty) {
    return NextResponse.json({ error: 'This citation has already been submitted for rewards' }, { status: 409 });
  }

  const userRef = db.collection('users').doc(sessionUser.uid);
  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection('researchCitations').doc(), {
      userId: sessionUser.uid,
      citationUrl: normalizedUrl,
      compoundSlug: parsed.data.compoundSlug ?? null,
      pointsAwarded: CITATION_REWARD_POINTS,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(
      userRef,
      {
        loyaltyPoints: FieldValue.increment(CITATION_REWARD_POINTS),
        totalPointsEarned: FieldValue.increment(CITATION_REWARD_POINTS),
      },
      { merge: true }
    );
  });

  return NextResponse.json({ ok: true, pointsAwarded: CITATION_REWARD_POINTS });
}
