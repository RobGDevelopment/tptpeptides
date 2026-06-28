import { NextResponse } from 'next/server';
import { checkoutRequestSchema } from '../../../../lib/schemas/checkout';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import {
  CheckoutValidationError,
  createPendingOrder,
  validateAndPriceCart,
} from '../../../../lib/firebase/orders.server';
import { getUserPricingTier } from '../../../../lib/firebase/pricing.server';
import { isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isB2BFeatureEnabled } from '../../../../lib/modules/b2b';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import {
  enforceGeoCompliance,
  GeoBlockedError,
  resolveCheckoutDestination,
} from '../../../../lib/compliance/checkoutDestination.server';
import { getEffectivePricingUserId } from '../../../../lib/impersonation/impersonation.server';
import {
  applyLoyaltyRedemptionToCart,
  LoyaltyRedemptionError,
} from '../../../../lib/growth/loyaltyCheckout.server';
import { markCartSnapshotConverted } from '../../../../lib/firebase/cartSnapshots.server';
import { getTaxExemptStatusForUser } from '../../../../lib/stripe/customer.server';
import { resolveShippingCost } from '../../../../lib/shipping/resolveShipping.server';
import { getAppBaseUrl, getStripe, isStripeConfigured } from '../../../../lib/stripe/server';
import { getClientIpAddress } from '../../../../lib/utils/requestIp.server';
import { getActiveTenantId } from '../../../../lib/tenant/getTenant.server';
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
  if (!sessionUser?.uid || !sessionUser.email) {
    return NextResponse.json(
      { error: 'Sign in with a verified institution account to request Net-30 terms.' },
      { status: 403 }
    );
  }

  const flags = await getModuleFlags();
  if (!isB2BFeatureEnabled(flags, 'isNetTermsEnabled')) {
    return NextResponse.json({ error: 'Net terms invoicing is not enabled.' }, { status: 404 });
  }

  const pricing = await getUserPricingTier(sessionUser.uid);
  if (!pricing.institutionVerified) {
    return NextResponse.json(
      { error: 'Institution verification is required before Net-30 invoicing.' },
      { status: 403 }
    );
  }

  try {
    const flags = await getModuleFlags();
    const destination = await resolveCheckoutDestination({
      userId: sessionUser.uid,
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
      uid: sessionUser.uid,
    });
    const pricingUserId = await getEffectivePricingUserId(request, sessionUser.uid);
    const cart = await validateAndPriceCart(parsed.data.items, { userId: pricingUserId, tenantId });
    const loyalty = await applyLoyaltyRedemptionToCart({
      userId: sessionUser.uid,
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
    const automaticTax = isModuleEnabled(flags, 'isStripeTaxEnabled');

    const { createNetTermsInvoice } = await import('../../../../lib/stripe/netTerms.server');
    const taxExempt = await getTaxExemptStatusForUser(sessionUser.uid);
    const invoice = await createNetTermsInvoice({
      email: sessionUser.email,
      userId: sessionUser.uid,
      orderId,
      items: loyalty.items,
      shipping: shippingEstimate,
      poNumber: parsed.data.poNumber ?? null,
      automaticTax,
      taxExempt,
    });

    await createPendingOrder({
      orderId,
      items: loyalty.items,
      subtotal,
      shipping: shippingEstimate,
      tax: 0,
      discountTotal: loyalty.loyaltyDiscount,
      total: orderTotal,
      userId: sessionUser.uid,
      guestEmail: null,
      stripeInvoiceId: invoice.invoiceId,
      paymentMethod: 'stripe_invoice',
      status: 'pending_invoice',
      poNumber: parsed.data.poNumber ?? null,
      pointsRedeemed: loyalty.pointsRedeemed,
      loyaltyDiscount: loyalty.loyaltyDiscount,
      ruoAttestationTimestamp,
      ipAddress,
      tenantId,
      attestationLogId: attestation.attestationLogId,
    });

    await markCartSnapshotConverted(sessionUser.uid, sessionUser.email);

    const baseUrl = getAppBaseUrl();
    return NextResponse.json({
      url: invoice.hostedInvoiceUrl,
      orderId,
      successUrl: `${baseUrl}/checkout/success?invoice_id=${invoice.invoiceId}`,
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
    console.error('[checkout] create-invoice failed', error);
    return NextResponse.json({ error: 'Unable to create Net-30 invoice' }, { status: 500 });
  }
}
