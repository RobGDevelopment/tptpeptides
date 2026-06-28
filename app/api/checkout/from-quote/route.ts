import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutRequestSchema } from '../../../../lib/schemas/checkout';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import {
  CheckoutValidationError,
  createPendingOrder,
} from '../../../../lib/firebase/orders.server';
import { isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isB2BFeatureEnabled } from '../../../../lib/modules/b2b';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import {
  enforceGeoCompliance,
  GeoBlockedError,
  resolveCheckoutDestination,
} from '../../../../lib/compliance/checkoutDestination.server';
import { resolveShippingCost } from '../../../../lib/shipping/resolveShipping.server';
import { getAppBaseUrl, getStripe, isStripeConfigured } from '../../../../lib/stripe/server';
import { getClientIpAddress } from '../../../../lib/utils/requestIp.server';
import { getActiveTenantId } from '../../../../lib/tenant/getTenant.server';
import {
  loadQuoteForCheckout,
  QuoteCheckoutError,
} from '../../../../lib/quotes/quoteCheckout.server';
import { markCartSnapshotConverted } from '../../../../lib/firebase/cartSnapshots.server';
import { getTaxExemptStatusForUser, findOrCreateStripeCustomer } from '../../../../lib/stripe/customer.server';
import { resolveCheckoutAttestation } from '../../../../lib/compliance/checkoutAttestation.server';
import { AttestationValidationError } from '../../../../lib/firebase/attestation.server';

export const dynamic = 'force-dynamic';

const fromQuoteSchema = checkoutRequestSchema
  .omit({ items: true })
  .extend({
    quoteId: z.string().min(1),
  });

export async function POST(request: Request) {
  if (!isStripeConfigured() || !isAdminSdkConfigured()) {
    return NextResponse.json({ error: 'Checkout is not configured.' }, { status: 503 });
  }

  const flags = await getModuleFlags();
  if (!isB2BFeatureEnabled(flags, 'isQuoteWorkflowEnabled')) {
    return NextResponse.json({ error: 'Quote checkout is not enabled.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = fromQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid quote checkout request' },
      { status: 400 }
    );
  }

  const sessionUser = await getSessionUserFromRequest(request);
  const email = sessionUser?.email ?? parsed.data.email;
  if (!email) {
    return NextResponse.json({ error: 'Email is required for quote checkout.' }, { status: 400 });
  }

  try {
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
    const { quote, items } = await loadQuoteForCheckout({
      quoteId: parsed.data.quoteId,
      userId: sessionUser?.uid ?? null,
      email,
    });

    const subtotal = quote.subtotal;
    const destination = await resolveCheckoutDestination({
      userId: sessionUser?.uid ?? null,
      shippingState: parsed.data.shippingState,
      shippingPostalCode: parsed.data.shippingPostalCode,
    });
    await enforceGeoCompliance(flags, destination);

    const shippingEstimate = quote.shipping;
    const orderTotal = quote.total;
    const ruoAttestationTimestamp = new Date().toISOString();
    const ipAddress = getClientIpAddress(request);
    const stripeTaxEnabled = isModuleEnabled(flags, 'isStripeTaxEnabled');
    const { getAdminFirestore } = await import('../../../../lib/firebase/admin');
    const orderId = getAdminFirestore().collection('orders').doc().id;

    if (parsed.data.paymentMethod === 'net_terms') {
      if (!sessionUser?.uid || !isB2BFeatureEnabled(flags, 'isNetTermsEnabled')) {
        return NextResponse.json({ error: 'Net-30 is not available for this quote.' }, { status: 400 });
      }

      const taxExempt = await getTaxExemptStatusForUser(sessionUser.uid);
      const { createNetTermsInvoice } = await import('../../../../lib/stripe/netTerms.server');
      const invoice = await createNetTermsInvoice({
        email,
        userId: sessionUser.uid,
        orderId,
        items,
        shipping: shippingEstimate,
        poNumber: parsed.data.poNumber ?? null,
        automaticTax: stripeTaxEnabled,
        taxExempt,
      });

      await createPendingOrder({
        orderId,
        items,
        subtotal,
        shipping: shippingEstimate,
        tax: quote.tax,
        discountTotal: 0,
        total: orderTotal,
        userId: sessionUser.uid,
        guestEmail: null,
        stripeInvoiceId: invoice.invoiceId,
        paymentMethod: 'stripe_invoice',
        status: 'pending_invoice',
        poNumber: parsed.data.poNumber ?? null,
        quoteId: quote.id,
        ruoAttestationTimestamp,
        ipAddress,
        tenantId,
        attestationLogId: attestation.attestationLogId,
      });

      await markCartSnapshotConverted(sessionUser.uid, email);

      const baseUrl = getAppBaseUrl();
      return NextResponse.json({
        url: invoice.hostedInvoiceUrl,
        orderId,
        successUrl: `${baseUrl}/checkout/success?invoice_id=${invoice.invoiceId}`,
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

    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${item.name} (${item.tag})`,
          description: `Quote ${quote.quoteNumber}`,
          metadata: { productId: item.id, quoteId: quote.id },
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
            description: `Quote ${quote.quoteNumber}`,
            metadata: { productId: 'shipping', quoteId: quote.id },
          },
          unit_amount: Math.round(shippingEstimate * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customer.id,
      customer_update: stripeTaxEnabled ? { address: 'auto', shipping: 'auto' } : undefined,
      line_items: lineItems,
      ...(stripeTaxEnabled
        ? {
            automatic_tax: { enabled: true },
            shipping_address_collection: { allowed_countries: ['US'] },
          }
        : {}),
      metadata: {
        orderId,
        quoteId: quote.id,
        userId: sessionUser?.uid ?? '',
        guestEmail: sessionUser ? '' : email,
        poNumber: parsed.data.poNumber ?? '',
        ...(attestation.attestationLogId ? { attestationLogId: attestation.attestationLogId } : {}),
      },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/quote?quoteId=${quote.id}&cancelled=1`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    await createPendingOrder({
      orderId,
      items,
      subtotal,
      shipping: shippingEstimate,
      tax: quote.tax,
      discountTotal: 0,
      total: orderTotal,
      userId: sessionUser?.uid ?? null,
      guestEmail: sessionUser ? null : email,
      stripeSessionId: session.id,
      poNumber: parsed.data.poNumber ?? null,
      quoteId: quote.id,
      ruoAttestationTimestamp,
      ipAddress,
      tenantId,
      attestationLogId: attestation.attestationLogId,
    });

    await markCartSnapshotConverted(sessionUser?.uid ?? null, email);

    return NextResponse.json({ url: session.url, orderId, quoteNumber: quote.quoteNumber });
  } catch (error) {
    if (error instanceof QuoteCheckoutError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CheckoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof GeoBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AttestationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[checkout/from-quote] failed', error);
    return NextResponse.json({ error: 'Unable to start quote checkout' }, { status: 500 });
  }
}
