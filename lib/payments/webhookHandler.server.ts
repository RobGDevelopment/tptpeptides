import 'server-only';

import { NextResponse } from 'next/server';
import { PaymentConfigurationError } from './errors';
import { fulfillProviderPayment } from './fulfillProviderPayment.server';
import { createPaymentProvider, isPaymentProviderConfigured } from './resolveProvider.server';
import type { PaymentProviderId } from './types';

export async function handlePaymentProviderWebhook(
  request: Request,
  providerId: PaymentProviderId
): Promise<NextResponse> {
  if (!isPaymentProviderConfigured(providerId)) {
    return NextResponse.json({ error: `${providerId} is not configured` }, { status: 503 });
  }

  const rawBody = await request.text();
  const provider = createPaymentProvider(providerId);

  try {
    const verification = await provider.verifyWebhook({
      rawBody,
      headers: request.headers,
    });

    if (!verification.valid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const orderId = verification.orderId?.trim();
    const transactionId = verification.transactionId?.trim();

    if (!orderId || !transactionId) {
      return NextResponse.json({ received: true, skipped: 'missing order or transaction id' });
    }

    const settled =
      verification.eventType?.includes('paid') ||
      verification.eventType?.includes('capture') ||
      verification.eventType?.includes('completed') ||
      verification.eventType?.includes('settled') ||
      verification.eventType?.includes('approved');

    if (!settled && providerId !== 'payram') {
      return NextResponse.json({ received: true, skipped: verification.eventType });
    }

    await fulfillProviderPayment({
      orderId,
      providerId,
      transactionId,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error(`[webhook/${providerId}] failed`, error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
