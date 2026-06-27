import { NextResponse } from 'next/server';
import { checkoutRequestSchema } from '../../../../lib/schemas/checkout';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import {
  CheckoutValidationError,
  createPendingOrder,
  validateAndPriceCart,
} from '../../../../lib/firebase/orders.server';
import { isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { estimateShipping } from '../../../../lib/shipping/estimate';
import { getAppBaseUrl, getStripe, isStripeConfigured } from '../../../../lib/stripe/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isStripeConfigured() || !isAdminSdkConfigured()) {
    return NextResponse.json(
      { error: 'Checkout is not configured. Contact support.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid checkout request' },
      { status: 400 }
    );
  }

  const sessionUser = await getSessionUserFromRequest(request);
  const email = sessionUser?.email ?? parsed.data.email;

  if (!email) {
    return NextResponse.json(
      { error: 'Email is required for guest checkout' },
      { status: 400 }
    );
  }

  try {
    const cart = await validateAndPriceCart(parsed.data.items);
    const shippingEstimate = estimateShipping(cart.items.length);
    const orderTotal = cart.total + shippingEstimate;
    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();
    const { getAdminFirestore } = await import('../../../../lib/firebase/admin');
    const orderId = getAdminFirestore().collection('orders').doc().id;

    const lineItems = cart.items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${item.name} (${item.tag})`,
          description: item.desc.slice(0, 200),
          metadata: {
            productId: item.id,
            purity: item.purity,
          },
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    if (shippingEstimate > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping & cold-chain handling',
            description: 'Estimated research logistics surcharge',
            metadata: { productId: 'shipping', purity: 'N/A' },
          },
          unit_amount: Math.round(shippingEstimate * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      allow_promotion_codes: true,
      line_items: lineItems,
      metadata: {
        orderId,
        userId: sessionUser?.uid ?? '',
        guestEmail: sessionUser ? '' : email,
        poNumber: parsed.data.poNumber ?? '',
      },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout?cancelled=1`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    await createPendingOrder({
      orderId,
      items: cart.items,
      total: orderTotal,
      userId: sessionUser?.uid ?? null,
      guestEmail: sessionUser ? null : email,
      stripeSessionId: session.id,
      poNumber: parsed.data.poNumber ?? null,
      shippingEstimate,
    });

    return NextResponse.json({ url: session.url, orderId });
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[checkout] create-session failed', error);
    return NextResponse.json({ error: 'Unable to start checkout' }, { status: 500 });
  }
}
