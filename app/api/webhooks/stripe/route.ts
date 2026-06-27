import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '../../../../lib/email/orderConfirmation.server';
import { fulfillPaidOrder } from '../../../../lib/firebase/orders.server';
import { getStripe, isStripeConfigured } from '../../../../lib/stripe/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe webhook] signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      console.error('[stripe webhook] checkout.session.completed missing orderId metadata');
      return NextResponse.json({ received: true });
    }

    try {
      const result = await fulfillPaidOrder(orderId);

      if (!result.alreadyFulfilled) {
        const email =
          session.customer_details?.email ??
          session.metadata?.guestEmail ??
          session.customer_email;

        if (email) {
          await sendOrderConfirmationEmail({
            email,
            orderId: result.orderId,
            total: (session.amount_total ?? 0) / 100,
            loyaltyPointsAwarded: result.loyaltyPointsAwarded,
          });
        }
      }
    } catch (error) {
      console.error('[stripe webhook] order fulfillment failed', error);
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
