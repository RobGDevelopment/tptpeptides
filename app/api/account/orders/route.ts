import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import { guestOrderLookupSchema } from '../../../../lib/schemas/checkout';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminSdkConfigured()) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const sessionUser = await getSessionUserFromRequest(request);
  const { searchParams } = new URL(request.url);

  if (sessionUser) {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('orders')
      .where('userId', '==', sessionUser.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const orders = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        total: Number(data.total),
        status: String(data.status),
        poNumber: (data.poNumber as string | undefined) ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        items: (data.items as unknown[]) ?? [],
        loyaltyPointsAwarded: Number(data.loyaltyPointsAwarded ?? 0),
      };
    });

    const userDoc = await db.collection('users').doc(sessionUser.uid).get();
    const userData = userDoc.data() ?? {};
    const flags = await getModuleFlags();

    return NextResponse.json({
      orders,
      profile: {
        email: sessionUser.email,
        loyaltyPoints: Number(userData.loyaltyPoints ?? 0),
        totalPointsEarned: Number(userData.totalPointsEarned ?? 0),
        shippingAddress: userData.shippingAddress ?? null,
        institutionVerified: Boolean(userData.institutionVerified ?? false),
        institutionTier: (userData.institutionTier as string | undefined) ?? null,
        modules: {
          institutionVerification: isModuleEnabled(flags, 'isInstitutionVerificationEnabled'),
        },
      },
    });
  }

  const parsed = guestOrderLookupSchema.safeParse({
    email: searchParams.get('email'),
    orderId: searchParams.get('orderId'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Authentication or guest lookup params required' }, { status: 400 });
  }

  const db = getAdminFirestore();
  const orderDoc = await db.collection('orders').doc(parsed.data.orderId).get();

  if (!orderDoc.exists) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const data = orderDoc.data()!;
  const guestEmail = String(data.guestEmail ?? '').toLowerCase();

  if (guestEmail !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({
    orders: [
      {
        id: orderDoc.id,
        total: Number(data.total),
        status: String(data.status),
        poNumber: (data.poNumber as string | undefined) ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        items: (data.items as unknown[]) ?? [],
        loyaltyPointsAwarded: 0,
      },
    ],
    profile: null,
  });
}
