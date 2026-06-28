import 'server-only';

import { PaymentConfigurationError, PaymentProviderError } from '../errors';
import type {
  CreateChargeInput,
  CreateChargeResult,
  RefundChargeInput,
  RefundChargeResult,
  VerifyWebhookInput,
  WebhookVerificationResult,
} from '../types';
import type { PaymentProvider } from './paymentProvider';

const PROVIDER_ID = 'nmi' as const;

/** NMI Direct Post / Gateway — override via NMI_API_URL if using a reseller endpoint. */
const DEFAULT_API_URL = 'https://secure.networkmerchants.com/api/transact.php';

/** Maps Sprint B attestation doc id to NMI merchant-defined field slot 1. */
const ATTESTATION_MERCHANT_FIELD = 'merchant_defined_field_1';

export function isNmiConfigured(): boolean {
  return Boolean(process.env.NMI_SECURITY_KEY?.trim());
}

function securityKey(): string {
  const key = process.env.NMI_SECURITY_KEY?.trim();
  if (!key) {
    throw new PaymentConfigurationError(PROVIDER_ID, 'Set NMI_SECURITY_KEY.');
  }
  return key;
}

function apiUrl(): string {
  return process.env.NMI_API_URL?.trim() || DEFAULT_API_URL;
}

function headerMap(headers: VerifyWebhookInput['headers']): Record<string, string> {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value != null) out[key.toLowerCase()] = value;
  }
  return out;
}

/** NMI transact.php returns URL-encoded key=value pairs (not JSON). */
function parseNmiResponse(text: string): Record<string, string> {
  const params = new URLSearchParams(text.trim());
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function postNmi(fields: Record<string, string>): Promise<Record<string, string>> {
  const body = new URLSearchParams({
    security_key: securityKey(),
    ...fields,
  });

  const response = await fetch(apiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/plain',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const text = await response.text();
  const parsed = parseNmiResponse(text);

  if (!response.ok) {
    throw new PaymentProviderError(
      PROVIDER_ID,
      parsed.responsetext ?? `NMI HTTP ${response.status}`,
      response.status
    );
  }

  return parsed;
}

function mapNmiStatus(responseCode: string | undefined): CreateChargeResult['status'] {
  // 1=Approved, 2=Declined, 3=Error
  switch (responseCode) {
    case '1':
      return 'captured';
    default:
      return 'failed';
  }
}

export class NmiProvider implements PaymentProvider {
  readonly providerId = PROVIDER_ID;

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    if (!input.paymentToken?.trim()) {
      throw new PaymentProviderError(
        PROVIDER_ID,
        'paymentToken is required (Collect.js payment_token or saved vault id).'
      );
    }

    const fields: Record<string, string> = {
      type: 'sale',
      amount: input.amount.amount.toFixed(2),
      currency: input.amount.currency.toUpperCase(),
      orderid: input.orderId,
      order_description: input.description ?? `Order ${input.orderId}`,
      email: input.email,
      payment_token: input.paymentToken.trim(),
    };

    if (input.attestationLogId?.trim()) {
      fields[ATTESTATION_MERCHANT_FIELD] = input.attestationLogId.trim();
    }

    fields.merchant_defined_field_2 = input.orderId;

    if (input.metadata) {
      let slot = 3;
      for (const [name, value] of Object.entries(input.metadata)) {
        if (!value.trim() || slot > 20) continue;
        fields[`merchant_defined_field_${slot}`] = `${name}=${value.trim()}`;
        slot += 1;
      }
    }

    const result = await postNmi(fields);
    const responseCode = result.response;
    const transactionId = result.transactionid;

    if (!transactionId) {
      throw new PaymentProviderError(
        PROVIDER_ID,
        result.responsetext ?? 'NMI did not return a transaction id'
      );
    }

    const status = mapNmiStatus(responseCode);
    if (status === 'failed') {
      throw new PaymentProviderError(PROVIDER_ID, result.responsetext ?? 'Transaction declined');
    }

    return {
      provider: PROVIDER_ID,
      transactionId,
      status,
      rawResponse: result,
    };
  }

  async refundCharge(input: RefundChargeInput): Promise<RefundChargeResult> {
    const fields: Record<string, string> = {
      type: 'refund',
      transactionid: input.transactionId,
    };

    if (input.amount) {
      fields.amount = input.amount.amount.toFixed(2);
      fields.currency = input.amount.currency.toUpperCase();
    }

    const result = await postNmi(fields);
    const refundId = result.transactionid;

    if (!refundId) {
      throw new PaymentProviderError(PROVIDER_ID, result.responsetext ?? 'NMI refund failed');
    }

    return {
      provider: PROVIDER_ID,
      refundId,
      status: result.response === '1' ? 'succeeded' : 'pending',
      rawResponse: result,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<WebhookVerificationResult> {
    // NMI_WEBHOOK_SIGNING_KEY — validate signature header against rawBody when using NMI webhooks
    const signingKey = process.env.NMI_WEBHOOK_SIGNING_KEY?.trim();
    const headers = headerMap(input.headers);
    const signature = headers['x-nmi-signature'] ?? headers['signature'];

    if (!signingKey) {
      throw new PaymentConfigurationError(
        PROVIDER_ID,
        'Set NMI_WEBHOOK_SIGNING_KEY for webhook verification.'
      );
    }

    if (!signature) {
      return { valid: false };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      payload = parseNmiResponse(input.rawBody) as unknown as Record<string, unknown>;
    }

    const transactionId = String(
      payload.transaction_id ?? payload.transactionid ?? payload.transactionId ?? ''
    );
    const orderId = String(payload.order_id ?? payload.orderid ?? payload.orderId ?? '');

    return {
      valid: Boolean(signature),
      eventType: String(payload.event_type ?? payload.type ?? 'unknown'),
      transactionId: transactionId || undefined,
      orderId: orderId || undefined,
      payload,
    };
  }
}

export function createNmiProvider(): NmiProvider {
  if (!isNmiConfigured()) {
    throw new PaymentConfigurationError(PROVIDER_ID, 'NMI is not configured.');
  }
  return new NmiProvider();
}
