import { NextResponse } from 'next/server';
import { checkoutRequestSchema } from '../../../../lib/schemas/checkout';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import {
  CheckoutValidationError,
  createPendingOrder,
  validateAndPriceCart,
} from '../../../../lib/firebase/orders.server';
import { isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import {
  enforceGeoCompliance,
  GeoBlockedError,
  resolveCheckoutDestination,
} from '../../../../lib/compliance/checkoutDestination.server';
import { resolveShippingCost } from '../../../../lib/shipping/resolveShipping.server';
import { getAppBaseUrl, getStripe, isStripeConfigured } from '../../../../lib/stripe/server';
import { getActiveTenantId } from '../../../../lib/tenant/getTenant.server';
import { getClientIpAddress } from '../../../../lib/utils/requestIp.server';
import { getEffectivePricingUserId } from '../../../../lib/impersonation/impersonation.server';
import {
  applyLoyaltyRedemptionToCart,
  LoyaltyRedemptionError,
} from '../../../../lib/growth/loyaltyCheckout.server';
import {
  findOrCreateStripeCustomer,
  getTaxExemptStatusForUser,
} from '../../../../lib/stripe/customer.server';
import { markCartSnapshotConverted } from '../../../../lib/firebase/cartSnapshots.server';
import { PromoCodeError, resolvePromotionCodeId } from '../../../../lib/stripe/promo.server';
import { resolveCheckoutAttestation } from '../../../../lib/compliance/checkoutAttestation.server';
import { AttestationValidationError } from '../../../../lib/firebase/attestation.server';

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
    const flags = await getModuleFlags();
    const stripeTaxEnabled = isModuleEnabled(flags, 'isStripeTaxEnabled');
    const destination = await resolveCheckoutDestination({
      userId: sessionUser?.uid ?? null,
      shippingState: parsed.data.shippingState,
      shippingPostalCode: parsed.data.shippingPostalCode,
    });

    await enforceGeoCompliance(flags, destination);

    const tenantId = await getActiveTenantId();
    const attestation = await resolveCheckoutAttestation({
      flags,
      input: {
        researchUseAcknowledged: parsed.data.researchUseAcknowledged,
        attestationLogId: parsed.data.attestationLogId,
      },
      tenantId,
      uid: sessionUser?.uid ?? null,
    });
    const pricingUserId = await getEffectivePricingUserId(request, sessionUser?.uid ?? null);
    const cart = await validateAndPriceCart(parsed.data.items, { userId: pricingUserId, tenantId });
    const loyalty = await applyLoyaltyRedemptionToCart({
      userId: sessionUser?.uid ?? null,
      items: cart.items,
      subtotal: cart.total,
      pointsToRedeem: parsed.data.pointsToRedeem,
    });
    const shippingEstimate = await resolveShippingCost({
      flags,
      itemCount: loyalty.items.length,
      destination,
    });
    const subtotal = loyalty.subtotal;
    const orderTotal = subtotal + shippingEstimate;
    const ruoAttestationTimestamp = new Date().toISOString();
    const ipAddress = getClientIpAddress(request);
    const { getAdminFirestore } = await import('../../../../lib/firebase/admin');
    const orderId = getAdminFirestore().collection('orders').doc().id;

    const lineItems = loyalty.items.map((item) => ({
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

    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();
    const taxExempt = await getTaxExemptStatusForUser(sessionUser?.uid ?? null);
    const customer = await findOrCreateStripeCustomer({
      email,
      userId: sessionUser?.uid ?? null,
      taxExempt,
    });

    let promotionCodeId: string | null = null;
    if (parsed.data.promoCode?.trim()) {
      promotionCodeId = await resolvePromotionCodeId(parsed.data.promoCode);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customer.id,
      customer_update: stripeTaxEnabled ? { address: 'auto', shipping: 'auto' } : undefined,
      allow_promotion_codes: promotionCodeId ? undefined : true,
      ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
      line_items: lineItems,
      ...(stripeTaxEnabled
        ? {
            automatic_tax: { enabled: true },
            shipping_address_collection: { allowed_countries: ['US'] },
          }
        : {}),
      metadata: {
        orderId,
        userId: sessionUser?.uid ?? '',
        guestEmail: sessionUser ? '' : email,
        poNumber: parsed.data.poNumber ?? '',
        pointsRedeemed: String(loyalty.pointsRedeemed),
        ...(attestation.attestationLogId ? { attestationLogId: attestation.attestationLogId } : {}),
      },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout?cancelled=1`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    await createPendingOrder({
      orderId,
      items: loyalty.items,
      subtotal,
      shipping: shippingEstimate,
      tax: 0,
      discountTotal: loyalty.loyaltyDiscount,
      total: orderTotal,
      userId: sessionUser?.uid ?? null,
      guestEmail: sessionUser ? null : email,
      stripeSessionId: session.id,
      poNumber: parsed.data.poNumber ?? null,
      pointsRedeemed: loyalty.pointsRedeemed,
      loyaltyDiscount: loyalty.loyaltyDiscount,
      ruoAttestationTimestamp,
      ipAddress,
      tenantId,
      attestationLogId: attestation.attestationLogId,
    });

    await markCartSnapshotConverted(sessionUser?.uid ?? null, email);

    return NextResponse.json({ url: session.url, orderId, paymentMode: 'stripe_checkout' });
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof GeoBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof LoyaltyRedemptionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PromoCodeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AttestationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[checkout] create-session failed', error);
    return NextResponse.json({ error: 'Unable to start checkout' }, { status: 500 });
  }
}
