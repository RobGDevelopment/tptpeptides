import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendShippingNotificationEmail } from '../../../../../lib/email/shippingNotification.server';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

async function resolveOrderRecipientEmail(order: Record<string, unknown>): Promise<string | null> {
  const guestEmail = order.guestEmail as string | null | undefined;
  if (guestEmail?.trim()) return guestEmail.trim();

  const userId = order.userId as string | null | undefined;
  if (!userId) return null;

  const db = getAdminFirestore();
  const userSnap = await db.collection('users').doc(userId).get();
  const email = userSnap.data()?.email;
  return typeof email === 'string' && email.trim() ? email.trim() : null;
}

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

    const previousStatus = String(orderSnap.data()?.status ?? '');
    const orderData = orderSnap.data()!;

    await orderRef.update({
      status: body.status,
      updatedAt: new Date(),
    });

    if (body.status === 'fulfilled' && previousStatus !== 'fulfilled') {
      const email = await resolveOrderRecipientEmail(orderData);
      if (email) {
        try {
          await sendShippingNotificationEmail({
            email,
            orderId,
            trackingNumber: (orderData.trackingNumber as string | null | undefined) ?? null,
            carrier: (orderData.carrier as string | null | undefined) ?? null,
          });
        } catch (emailError) {
          console.error('[admin/orders] shipping email failed', emailError);
        }
      }
    }

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
