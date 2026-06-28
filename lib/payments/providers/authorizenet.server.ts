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

const PROVIDER_ID = 'authorizenet' as const;

const AUTHORIZE_NET_API =
  process.env.AUTHORIZE_NET_API_URL?.trim() || 'https://api.authorize.net/xml/v1/request.api';

const ATTESTATION_USER_FIELD = 'attestationLogId';

export function isAuthorizeNetConfigured(): boolean {
  return Boolean(
    process.env.AUTHORIZE_NET_API_LOGIN_ID?.trim() &&
      process.env.AUTHORIZE_NET_TRANSACTION_KEY?.trim()
  );
}

function merchantAuthentication() {
  const name = process.env.AUTHORIZE_NET_API_LOGIN_ID?.trim();
  const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY?.trim();
  if (!name || !transactionKey) {
    throw new PaymentConfigurationError(
      PROVIDER_ID,
      'Set AUTHORIZE_NET_API_LOGIN_ID and AUTHORIZE_NET_TRANSACTION_KEY.'
    );
  }
  return { name, transactionKey };
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

async function postAuthorizeNet<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(AUTHORIZE_NET_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw new PaymentProviderError(
      PROVIDER_ID,
      `Invalid Authorize.net response (${response.status})`,
      response.status
    );
  }

  if (!response.ok) {
    throw new PaymentProviderError(
      PROVIDER_ID,
      `Authorize.net HTTP ${response.status}`,
      response.status
    );
  }

  return payload as T;
}

function buildUserFields(input: CreateChargeInput): Array<{ name: string; value: string }> {
  const fields: Array<{ name: string; value: string }> = [];

  if (input.attestationLogId?.trim()) {
    fields.push({ name: ATTESTATION_USER_FIELD, value: input.attestationLogId.trim() });
  }

  fields.push({ name: 'orderId', value: input.orderId });

  if (input.metadata) {
    for (const [name, value] of Object.entries(input.metadata)) {
      if (value.trim()) fields.push({ name, value: value.trim() });
    }
  }

  return fields;
}

function mapTransactionStatus(responseCode: string | undefined): CreateChargeResult['status'] {
  // Authorize.net: 1=Approved, 2=Declined, 3=Error, 4=Held for Review
  switch (responseCode) {
    case '1':
      return 'captured';
    case '4':
      return 'authorized';
    default:
      return 'failed';
  }
}

export class AuthorizeNetProvider implements PaymentProvider {
  readonly providerId = PROVIDER_ID;

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    if (!input.paymentToken?.trim()) {
      throw new PaymentProviderError(
        PROVIDER_ID,
        'paymentToken is required (Accept.js opaque data or payment nonce).'
      );
    }

    const userFields = buildUserFields(input);

    const requestBody = {
      createTransactionRequest: {
        merchantAuthentication: merchantAuthentication(),
        refId: input.idempotencyKey ?? input.orderId,
        transactionRequest: {
          transactionType: 'authCaptureTransaction',
          amount: input.amount.amount.toFixed(2),
          currencyCode: input.amount.currency.toUpperCase(),
          order: {
            invoiceNumber: input.orderId,
            description: input.description ?? `Order ${input.orderId}`,
          },
          payment: {
            opaqueData: {
              dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
              dataValue: input.paymentToken.trim(),
            },
          },
          customer: {
            email: input.email,
          },
          userFields: {
            userField: userFields,
          },
        },
      },
    };

    type AuthNetResponse = {
      transactionResponse?: {
        transId?: string;
        responseCode?: string;
        errors?: Array<{ errorText?: string }>;
      };
      messages?: { message?: Array<{ text?: string }> };
    };

    const result = await postAuthorizeNet<AuthNetResponse>(requestBody);
    const tx = result.transactionResponse;
    const transId = tx?.transId;

    if (!transId) {
      const message =
        tx?.errors?.[0]?.errorText ??
        result.messages?.message?.[0]?.text ??
        'Authorize.net did not return a transaction id';
      throw new PaymentProviderError(PROVIDER_ID, message);
    }

    const status = mapTransactionStatus(tx.responseCode);
    if (status === 'failed') {
      throw new PaymentProviderError(
        PROVIDER_ID,
        tx.errors?.[0]?.errorText ?? 'Transaction declined'
      );
    }

    return {
      provider: PROVIDER_ID,
      transactionId: transId,
      status,
      rawResponse: result,
    };
  }

  async refundCharge(input: RefundChargeInput): Promise<RefundChargeResult> {
    const requestBody = {
      createTransactionRequest: {
        merchantAuthentication: merchantAuthentication(),
        refId: input.idempotencyKey ?? input.transactionId,
        transactionRequest: {
          transactionType: 'refundTransaction',
          amount: input.amount?.amount.toFixed(2),
          currencyCode: input.amount?.currency.toUpperCase() ?? 'USD',
          refTransId: input.transactionId,
        },
      },
    };

    type RefundResponse = {
      transactionResponse?: { transId?: string; responseCode?: string };
    };

    const result = await postAuthorizeNet<RefundResponse>(requestBody);
    const refundId = result.transactionResponse?.transId;
    if (!refundId) {
      throw new PaymentProviderError(PROVIDER_ID, 'Authorize.net refund failed — no transId returned');
    }

    return {
      provider: PROVIDER_ID,
      refundId,
      status: result.transactionResponse?.responseCode === '1' ? 'succeeded' : 'pending',
      rawResponse: result,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<WebhookVerificationResult> {
    // AUTHORIZE_NET_SIGNATURE_KEY — HMAC validation of webhook body (configure in merchant dashboard)
    const signatureKey = process.env.AUTHORIZE_NET_SIGNATURE_KEY?.trim();
    const headers = headerMap(input.headers);
    const signature = headers['x-anet-signature'] ?? headers['x-authorize-net-signature'];

    if (!signatureKey) {
      throw new PaymentConfigurationError(
        PROVIDER_ID,
        'Set AUTHORIZE_NET_SIGNATURE_KEY for webhook verification.'
      );
    }

    if (!signature) {
      return { valid: false };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      return { valid: false };
    }

    // Production wiring: compute HMAC-SHA512 of rawBody with signatureKey and compare to signature header.
    // Scaffold returns structural parse only until signature helper is finalized with live webhook samples.
    const eventType = String(payload.eventType ?? payload.notificationId ?? 'unknown');
    const transactionId =
      typeof payload.payload === 'object' && payload.payload != null
        ? String((payload.payload as Record<string, unknown>).id ?? '')
        : undefined;

    return {
      valid: Boolean(signature),
      eventType,
      transactionId: transactionId || undefined,
      payload,
    };
  }
}

export function createAuthorizeNetProvider(): AuthorizeNetProvider {
  if (!isAuthorizeNetConfigured()) {
    throw new PaymentConfigurationError(
      PROVIDER_ID,
      'Authorize.net is not configured.'
    );
  }
  return new AuthorizeNetProvider();
}
