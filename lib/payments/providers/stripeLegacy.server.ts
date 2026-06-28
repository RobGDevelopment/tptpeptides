import 'server-only';

import Stripe from 'stripe';
import { PaymentConfigurationError, PaymentProviderError } from '../errors';
import { getStripe, isStripeConfigured } from '../../stripe/server';
import type {
  CreateChargeInput,
  CreateChargeResult,
  RefundChargeInput,
  RefundChargeResult,
  VerifyWebhookInput,
  WebhookVerificationResult,
} from '../types';
import type { PaymentProvider } from './paymentProvider';

const PROVIDER_ID = 'stripe' as const;

function toStripeMetadata(input: CreateChargeInput): Record<string, string> {
  const metadata: Record<string, string> = {
    orderId: input.orderId,
    ...(input.metadata ?? {}),
  };
  if (input.attestationLogId?.trim()) {
    metadata.attestationLogId = input.attestationLogId.trim();
  }
  return metadata;
}

function mapPaymentIntentStatus(status: Stripe.PaymentIntent.Status): CreateChargeResult['status'] {
  switch (status) {
    case 'succeeded':
      return 'captured';
    case 'processing':
    case 'requires_capture':
      return 'authorized';
    case 'requires_payment_method':
    case 'canceled':
      return 'failed';
    default:
      return 'pending';
  }
}

export class StripeLegacyProvider implements PaymentProvider {
  readonly providerId = PROVIDER_ID;

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const stripe = getStripe();
    const amountMinor = Math.round(input.amount.amount * 100);

    if (amountMinor <= 0) {
      throw new PaymentProviderError(PROVIDER_ID, 'Charge amount must be greater than zero.');
    }

    const params: Stripe.PaymentIntentCreateParams = {
      amount: amountMinor,
      currency: input.amount.currency.toLowerCase(),
      description: input.description ?? `Order ${input.orderId}`,
      metadata: toStripeMetadata(input),
      receipt_email: input.email,
    };

    if (input.paymentToken?.trim()) {
      params.payment_method = input.paymentToken.trim();
      params.confirm = true;
      params.automatic_payment_methods = { enabled: false };
    }

    if (input.idempotencyKey) {
      const intent = await stripe.paymentIntents.create(params, {
        idempotencyKey: input.idempotencyKey,
      });
      return this.toChargeResult(intent);
    }

    const intent = await stripe.paymentIntents.create(params);
    return this.toChargeResult(intent);
  }

  private toChargeResult(intent: Stripe.PaymentIntent): CreateChargeResult {
    const status = mapPaymentIntentStatus(intent.status);
    if (status === 'failed') {
      throw new PaymentProviderError(
        PROVIDER_ID,
        intent.last_payment_error?.message ?? 'Stripe payment failed'
      );
    }

    return {
      provider: PROVIDER_ID,
      transactionId: intent.id,
      status,
      rawResponse: intent,
    };
  }

  async refundCharge(input: RefundChargeInput): Promise<RefundChargeResult> {
    const stripe = getStripe();
    const params: Stripe.RefundCreateParams = {
      payment_intent: input.transactionId,
    };

    if (input.amount) {
      params.amount = Math.round(input.amount.amount * 100);
    }

    const refund = input.idempotencyKey
      ? await stripe.refunds.create(params, { idempotencyKey: input.idempotencyKey })
      : await stripe.refunds.create(params);

    return {
      provider: PROVIDER_ID,
      refundId: refund.id,
      status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
      rawResponse: refund,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<WebhookVerificationResult> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new PaymentConfigurationError(
        PROVIDER_ID,
        'Set STRIPE_WEBHOOK_SECRET for webhook verification.'
      );
    }

    const headers = input.headers instanceof Headers ? input.headers : new Headers();
    if (!(input.headers instanceof Headers)) {
      for (const [key, value] of Object.entries(input.headers)) {
        if (value != null) headers.set(key, value);
      }
    }

    const signature = headers.get('stripe-signature');
    if (!signature) {
      return { valid: false };
    }

    try {
      const event = getStripe().webhooks.constructEvent(input.rawBody, signature, secret);
      const object = event.data.object as Stripe.PaymentIntent | Stripe.Checkout.Session;
      const transactionId =
        'payment_intent' in object && typeof object.payment_intent === 'string'
          ? object.payment_intent
          : 'id' in object
            ? object.id
            : undefined;

      const metadata =
        'metadata' in object && object.metadata ? object.metadata : undefined;

      return {
        valid: true,
        eventType: event.type,
        transactionId,
        orderId: metadata?.orderId,
        payload: event,
      };
    } catch {
      return { valid: false };
    }
  }
}

export function createStripeLegacyProvider(): StripeLegacyProvider {
  if (!isStripeConfigured()) {
    throw new PaymentConfigurationError(PROVIDER_ID, 'Stripe is not configured.');
  }
  return new StripeLegacyProvider();
}
