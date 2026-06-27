import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { userProfileUpdateSchema } from '../../../../lib/schemas/user';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  if (!isAdminSdkConfigured()) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const sessionUser = await getSessionUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = userProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid profile data' },
      { status: 400 }
    );
  }

  const { shippingAddress } = parsed.data;

  if (!shippingAddress) {
    return NextResponse.json({ error: 'No profile fields to update' }, { status: 400 });
  }

  const db = getAdminFirestore();
  await db.collection('users').doc(sessionUser.uid).set({ shippingAddress }, { merge: true });

  return NextResponse.json({ ok: true });
}
