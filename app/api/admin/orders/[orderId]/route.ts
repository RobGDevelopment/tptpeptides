import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  status: z.enum(['pending_payment', 'paid', 'processing', 'fulfilled', 'cancelled']),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await requireAdminSession(request);
    const { orderId } = await context.params;

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const body = bodySchema.parse(await request.json());
    const db = getAdminFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await orderRef.update({ status: body.status, updatedAt: new Date() });

    await logAdminAction({
      userId: admin.uid,
      action: 'order_status_update',
      metadata: { orderId, status: body.status },
    });

    return NextResponse.json({ ok: true, orderId, status: body.status });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    console.error('[admin/orders] PATCH failed', error);
    return NextResponse.json({ error: 'Unable to update order' }, { status: 500 });
  }
}
