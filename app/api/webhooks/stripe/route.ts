import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '../../../../lib/email/orderConfirmation.server';
import {
  buildStripeFulfillmentSnapshot,
  fulfillPaidOrder,
  type StripeFulfillmentSnapshot,
} from '../../../../lib/firebase/orders.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { runPostPaymentAutomation } from '../../../../lib/procurement/postPaymentAutomation.server';
import { getStripe, isStripeConfigured } from '../../../../lib/stripe/server';
import type Stripe from 'stripe';

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
      const stripeSnapshot = buildStripeFulfillmentSnapshot(session);
      await fulfillStripeOrder(orderId, stripeSnapshot, session.customer_details?.email ?? session.metadata?.guestEmail ?? session.customer_email ?? null, session.amount_total ?? 0);
    } catch (error) {
      console.error('[stripe webhook] order fulfillment failed', error);
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const orderId = invoice.metadata?.orderId;

    if (!orderId) {
      console.error('[stripe webhook] invoice.paid missing orderId metadata');
      return NextResponse.json({ received: true });
    }

    try {
      const stripeSnapshot = buildInvoiceFulfillmentSnapshot(invoice);
      await fulfillStripeOrder(
        orderId,
        stripeSnapshot,
        invoice.customer_email ?? null,
        invoice.amount_paid ?? 0
      );
    } catch (error) {
      console.error('[stripe webhook] invoice fulfillment failed', error);
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function fulfillStripeOrder(
  orderId: string,
  stripeSnapshot: StripeFulfillmentSnapshot,
  email: string | null,
  amountCents: number
) {
  const result = await fulfillPaidOrder(orderId, stripeSnapshot);

  if (!result.alreadyFulfilled) {
    const flags = await getModuleFlags();
    await runPostPaymentAutomation(orderId, flags);
  }

  if (!result.alreadyFulfilled && email) {
    await sendOrderConfirmationEmail({
      email,
      orderId: result.orderId,
      total: amountCents / 100,
      loyaltyPointsAwarded: result.loyaltyPointsAwarded,
    });
  }
}

function buildInvoiceFulfillmentSnapshot(invoice: Stripe.Invoice): StripeFulfillmentSnapshot {
  const paymentIntent = (invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null })
    .payment_intent;
  const taxCents =
    invoice.total_taxes?.reduce((sum, row) => sum + row.amount, 0) ??
    (invoice as Stripe.Invoice & { tax?: number | null }).tax ??
    0;

  return {
    paymentIntentId:
      typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id ?? null,
    subtotal: (invoice.subtotal ?? 0) / 100,
    tax: taxCents / 100,
    shipping: 0,
    discountTotal: (invoice.total_discount_amounts?.reduce((sum, row) => sum + row.amount, 0) ?? 0) / 100,
    total: (invoice.amount_paid ?? 0) / 100,
  };
}
