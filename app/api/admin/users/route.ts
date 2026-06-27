import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(['admin', 'customer']).optional(),
  disabled: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const db = getAdminFirestore();
    const snapshot = await db.collection('users').limit(200).get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: (data.email as string | undefined) ?? null,
        role: (data.role as string | undefined) ?? 'customer',
        disabled: Boolean(data.disabled ?? false),
        loyaltyPoints: Number(data.loyaltyPoints ?? 0),
        totalPointsEarned: Number(data.totalPointsEarned ?? 0),
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[admin/users] GET failed', error);
    return NextResponse.json({ error: 'Unable to load users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminSession(request);

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const payload = updateSchema.parse(await request.json());
    const db = getAdminFirestore();

    const updates: Record<string, unknown> = {};
    if (payload.role) updates.role = payload.role;
    if (payload.disabled != null) updates.disabled = payload.disabled;

    await db.collection('users').doc(payload.uid).set(updates, { merge: true });

    await logAdminAction({
      userId: admin.uid,
      action: 'user_update',
      metadata: { targetUid: payload.uid, ...updates },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('[admin/users] PATCH failed', error);
    return NextResponse.json({ error: 'Unable to update user' }, { status: 500 });
  }
}
