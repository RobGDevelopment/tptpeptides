import { NextResponse } from 'next/server';
import { getOrderByStripeSessionId } from '../../../../lib/firebase/orders.server';
import { isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getStripe, isStripeConfigured } from '../../../../lib/stripe/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  if (!isStripeConfigured() || !isAdminSdkConfigured()) {
    return NextResponse.json({ error: 'Checkout is not configured' }, { status: 503 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    const order = await getOrderByStripeSessionId(sessionId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      orderId: order.id,
      total: order.total,
      status: order.status,
      email: session.customer_details?.email ?? order.guestEmail ?? null,
      loyaltyPointsAwarded: order.loyaltyPointsAwarded ?? 0,
    });
  } catch (error) {
    console.error('[checkout] session lookup failed', error);
    return NextResponse.json({ error: 'Unable to load order confirmation' }, { status: 500 });
  }
}
