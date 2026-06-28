import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutLineItemSchema } from '../../../../lib/schemas/checkout';
import { resolveCheckoutAttestation } from '../../../../lib/compliance/checkoutAttestation.server';
import { AttestationValidationError } from '../../../../lib/firebase/attestation.server';
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
import { getActiveTenantId } from '../../../../lib/tenant/getTenant.server';
import { getClientIpAddress } from '../../../../lib/utils/requestIp.server';
import { getEffectivePricingUserId } from '../../../../lib/impersonation/impersonation.server';
import {
  applyLoyaltyRedemptionToCart,
  LoyaltyRedemptionError,
} from '../../../../lib/growth/loyaltyCheckout.server';
import { resolveCheckoutPaymentPlanForTenant } from '../../../../lib/payments/checkoutRouter.server';
import { PaymentConfigurationError, PaymentProviderError } from '../../../../lib/payments/errors';
import { createPaymentProvider } from '../../../../lib/payments/resolveProvider.server';
import { fulfillProviderPayment } from '../../../../lib/payments/fulfillProviderPayment.server';

export const dynamic = 'force-dynamic';

const chargeRequestSchema = z.object({
  items: z.array(checkoutLineItemSchema).min(1),
  email: z.string().email().optional(),
  paymentToken: z.string().min(1),
  attestationLogId: z.string().optional(),
  researchUseAcknowledged: z.literal(true).optional(),
  poNumber: z.string().max(64).optional(),
  shippingState: z.string().length(2).optional(),
  shippingPostalCode: z.string().min(3).max(10).optional(),
  pointsToRedeem: z.number().int().nonnegative().optional(),
  idempotencyKey: z.string().max(64).optional(),
});

/** Direct provider charge — active only when isAlternatePaymentRailsEnabled and Stripe cutover is off. */
export async function POST(request: Request) {
  if (!isAdminSdkConfigured()) {
    return NextResponse.json({ error: 'Checkout is not configured.' }, { status: 503 });
  }

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isAlternatePaymentRailsEnabled')) {
    return NextResponse.json({ error: 'Alternate payment rails are not enabled.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = chargeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid charge request' },
      { status: 400 }
    );
  }

  const sessionUser = await getSessionUserFromRequest(request);
  const email = sessionUser?.email ?? parsed.data.email;
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const tenantId = await getActiveTenantId();
    const paymentPlan = await resolveCheckoutPaymentPlanForTenant(tenantId, flags);

    if (paymentPlan.mode !== 'direct_provider') {
      return NextResponse.json(
        {
          error: 'Stripe checkout is active for this tenant. Use /api/checkout/create-session.',
          paymentMode: 'stripe_checkout',
        },
        { status: 409 }
      );
    }

    const attestation = await resolveCheckoutAttestation({
      flags,
      input: {
        researchUseAcknowledged: parsed.data.researchUseAcknowledged,
        attestationLogId: parsed.data.attestationLogId,
      },
      tenantId,
      uid: sessionUser?.uid ?? null,
    });

    const destination = await resolveCheckoutDestination({
      userId: sessionUser?.uid ?? null,
      shippingState: parsed.data.shippingState,
      shippingPostalCode: parsed.data.shippingPostalCode,
    });
    await enforceGeoCompliance(flags, destination);

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
      poNumber: parsed.data.poNumber ?? null,
      pointsRedeemed: loyalty.pointsRedeemed,
      loyaltyDiscount: loyalty.loyaltyDiscount,
      ruoAttestationTimestamp,
      ipAddress,
      tenantId,
      attestationLogId: attestation.attestationLogId,
    });

    const provider = createPaymentProvider(paymentPlan.providerId);
    const charge = await provider.createCharge({
      orderId,
      amount: { currency: 'USD', amount: orderTotal },
      email,
      description: `Order ${orderId}`,
      attestationLogId: attestation.attestationLogId,
      paymentToken: parsed.data.paymentToken,
      idempotencyKey: parsed.data.idempotencyKey ?? orderId,
    });

    if (charge.status === 'captured') {
      await fulfillProviderPayment({
        orderId,
        providerId: paymentPlan.providerId,
        transactionId: charge.transactionId,
        email,
        amount: orderTotal,
      });
    }

    return NextResponse.json({
      paymentMode: 'direct_provider',
      providerId: paymentPlan.providerId,
      orderId,
      transactionId: charge.transactionId,
      status: charge.status,
    });
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
    if (error instanceof AttestationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PaymentConfigurationError || error instanceof PaymentProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error('[checkout/charge] failed', error);
    return NextResponse.json({ error: 'Unable to process payment' }, { status: 500 });
  }
}
