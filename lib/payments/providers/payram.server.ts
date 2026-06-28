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

const PROVIDER_ID = 'payram' as const;

/** Self-hosted PayRam node — inject PAYRAM_API_BASE (e.g. https://payram.example.com/api). */
const DEFAULT_API_BASE = 'https://localhost:8443/api/v1';

export type PayRamAsset = 'USDC' | 'USDT' | 'BTC';

export function isPayRamConfigured(): boolean {
  return Boolean(
    process.env.PAYRAM_API_KEY?.trim() && process.env.PAYRAM_API_BASE?.trim()
  );
}

function apiBase(): string {
  const base = process.env.PAYRAM_API_BASE?.trim();
  if (!base) {
    throw new PaymentConfigurationError(PROVIDER_ID, 'Set PAYRAM_API_BASE.');
  }
  return base.replace(/\/$/, '');
}

function apiKey(): string {
  const key = process.env.PAYRAM_API_KEY?.trim();
  if (!key) {
    throw new PaymentConfigurationError(PROVIDER_ID, 'Set PAYRAM_API_KEY.');
  }
  return key;
}

/** Cold wallet destination — PAYRAM_SETTLEMENT_WALLET per tenant (Sprint D). */
function settlementWallet(): string | undefined {
  return process.env.PAYRAM_SETTLEMENT_WALLET?.trim() || undefined;
}

async function payRamPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Api-Key': apiKey(),
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
    throw new PaymentProviderError(
      PROVIDER_ID,
      `PayRam request failed (${response.status})`,
      response.status
    );
  }

  return payload as T;
}

export class PayRamProvider implements PaymentProvider {
  readonly providerId = PROVIDER_ID;

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const asset = (process.env.PAYRAM_DEFAULT_ASSET?.trim().toUpperCase() ?? 'USDC') as PayRamAsset;

    // POST /invoices — crypto payment request; customer pays on-chain to settlement wallet.
    const body = {
      external_id: input.orderId,
      amount: input.amount.amount,
      currency: input.amount.currency.toUpperCase(),
      asset,
      settlement_wallet: settlementWallet(),
      customer_email: input.email,
      description: input.description ?? `Order ${input.orderId}`,
      metadata: {
        orderId: input.orderId,
        ...(input.metadata ?? {}),
      },
    };

    type InvoiceResponse = {
      invoice_id?: string;
      payment_id?: string;
      status?: string;
      payment_address?: string;
    };

    const result = await payRamPost<InvoiceResponse>('/invoices', body);
    const transactionId = result.payment_id ?? result.invoice_id;

    if (!transactionId) {
      throw new PaymentProviderError(PROVIDER_ID, 'PayRam did not return an invoice or payment id.');
    }

    return {
      provider: PROVIDER_ID,
      transactionId,
      status: 'pending',
      rawResponse: result,
    };
  }

  async refundCharge(input: RefundChargeInput): Promise<RefundChargeResult> {
    // On-chain refunds are manual or via PayRam payout API — scaffold only.
    const body = {
      payment_id: input.transactionId,
      amount: input.amount?.amount,
      reason: input.reason ?? 'customer_request',
    };

    type RefundResponse = { refund_id?: string; status?: string };

    const result = await payRamPost<RefundResponse>('/refunds', body);

    if (!result.refund_id) {
      throw new PaymentProviderError(PROVIDER_ID, 'PayRam refund did not return a refund_id.');
    }

    return {
      provider: PROVIDER_ID,
      refundId: result.refund_id,
      status: result.status === 'confirmed' ? 'succeeded' : 'pending',
      rawResponse: result,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<WebhookVerificationResult> {
    // PAYRAM_WEBHOOK_SECRET — HMAC or shared secret header validation
    const secret = process.env.PAYRAM_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new PaymentConfigurationError(
        PROVIDER_ID,
        'Set PAYRAM_WEBHOOK_SECRET for webhook verification.'
      );
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      return { valid: false };
    }

    const confirmations = Number(payload.confirmations ?? 0);

    return {
      valid: true,
      eventType: String(payload.event ?? 'payment.update'),
      transactionId: String(payload.payment_id ?? payload.tx_hash ?? ''),
      orderId: String(payload.external_id ?? ''),
      payload: { ...payload, confirmed: confirmations > 0 },
    };
  }
}

export function createPayRamProvider(): PayRamProvider {
  if (!isPayRamConfigured()) {
    throw new PaymentConfigurationError(PROVIDER_ID, 'PayRam is not configured.');
  }
  return new PayRamProvider();
}
