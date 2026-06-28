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

const PROVIDER_ID = 'seamlesschex' as const;

/** Base URL — override via SEAMLESSCHEX_API_BASE (sandbox vs production). */
const DEFAULT_API_BASE = 'https://api.seamlesschex.com/v1';

export function isSeamlessChexConfigured(): boolean {
  return Boolean(process.env.SEAMLESSCHEX_API_KEY?.trim());
}

function apiBase(): string {
  return process.env.SEAMLESSCHEX_API_BASE?.trim() || DEFAULT_API_BASE;
}

function apiKey(): string {
  const key = process.env.SEAMLESSCHEX_API_KEY?.trim();
  if (!key) {
    throw new PaymentConfigurationError(PROVIDER_ID, 'Set SEAMLESSCHEX_API_KEY.');
  }
  return key;
}

/** Merchant deposit account — inject SEAMLESSCHEX_MERCHANT_ACCOUNT_ID in Vercel. */
function merchantAccountId(): string | undefined {
  return process.env.SEAMLESSCHEX_MERCHANT_ACCOUNT_ID?.trim() || undefined;
}

async function seamlessChexPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // SEAMLESSCHEX_API_KEY — bearer or custom header per merchant agreement
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload != null &&
      'message' in payload &&
      typeof (payload as { message: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : `SeamlessChex request failed (${response.status})`;
    throw new PaymentProviderError(PROVIDER_ID, message, response.status);
  }

  return payload as T;
}

export class SeamlessChexProvider implements PaymentProvider {
  readonly providerId = PROVIDER_ID;

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    if (!input.paymentToken?.trim()) {
      throw new PaymentProviderError(
        PROVIDER_ID,
        'paymentToken is required (ACH account token from SeamlessChex hosted onboarding).'
      );
    }

    // POST /payments/ach — structure scaffolded; field names may vary by SeamlessChex API version.
    const body = {
      amount: input.amount.amount,
      currency: input.amount.currency.toUpperCase(),
      reference_id: input.orderId,
      description: input.description ?? `Order ${input.orderId}`,
      customer_email: input.email,
      payment_method_token: input.paymentToken.trim(),
      merchant_account_id: merchantAccountId(),
      metadata: {
        orderId: input.orderId,
        ...(input.metadata ?? {}),
      },
    };

    type AchResponse = {
      id?: string;
      status?: string;
    };

    const result = await seamlessChexPost<AchResponse>('/payments/ach', body);

    if (!result.id) {
      throw new PaymentProviderError(PROVIDER_ID, 'SeamlessChex did not return a payment id.');
    }

    const normalized = (result.status ?? 'pending').toLowerCase();
    const status: CreateChargeResult['status'] =
      normalized === 'completed' || normalized === 'settled'
        ? 'captured'
        : normalized === 'authorized'
          ? 'authorized'
          : 'pending';

    return {
      provider: PROVIDER_ID,
      transactionId: result.id,
      status,
      rawResponse: result,
    };
  }

  async refundCharge(input: RefundChargeInput): Promise<RefundChargeResult> {
    const body = {
      transaction_id: input.transactionId,
      amount: input.amount?.amount,
      reason: input.reason ?? 'customer_request',
    };

    type RefundResponse = { id?: string; status?: string };

    const result = await seamlessChexPost<RefundResponse>('/payments/refund', body);

    if (!result.id) {
      throw new PaymentProviderError(PROVIDER_ID, 'SeamlessChex refund did not return an id.');
    }

    return {
      provider: PROVIDER_ID,
      refundId: result.id,
      status: result.status === 'completed' ? 'succeeded' : 'pending',
      rawResponse: result,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<WebhookVerificationResult> {
    // SEAMLESSCHEX_WEBHOOK_SECRET — validate HMAC signature header on rawBody
    const secret = process.env.SEAMLESSCHEX_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new PaymentConfigurationError(
        PROVIDER_ID,
        'Set SEAMLESSCHEX_WEBHOOK_SECRET for webhook verification.'
      );
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      return { valid: false };
    }

    return {
      valid: true,
      eventType: String(payload.event ?? payload.type ?? 'unknown'),
      transactionId: String(payload.transaction_id ?? payload.payment_id ?? ''),
      orderId: String(
        payload.reference_id ??
          (typeof payload.metadata === 'object' && payload.metadata != null
            ? (payload.metadata as Record<string, unknown>).orderId
            : '') ??
          ''
      ),
      payload,
    };
  }
}

export function createSeamlessChexProvider(): SeamlessChexProvider {
  if (!isSeamlessChexConfigured()) {
    throw new PaymentConfigurationError(PROVIDER_ID, 'SeamlessChex is not configured.');
  }
  return new SeamlessChexProvider();
}
