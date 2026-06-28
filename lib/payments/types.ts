/** Shared payment rail types — Sprint C scaffolding (not wired to checkout yet). */

export type PaymentProviderId = 'authorizenet' | 'nmi' | 'seamlesschex' | 'payram' | 'stripe';

export type PaymentRail = 'b2b_card' | 'b2c_ach' | 'b2c_crypto';

export interface MoneyAmount {
  /** ISO 4217 currency code */
  currency: string;
  /** Decimal major units (e.g. 49.99 USD) */
  amount: number;
}

export interface CreateChargeInput {
  orderId: string;
  amount: MoneyAmount;
  email: string;
  description?: string;
  /** Immutable attestation log document ID (Sprint B) — required for B2B high-risk rails */
  attestationLogId?: string | null;
  /** Opaque payment method token from hosted fields / Accept.js / wallet */
  paymentToken?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface CreateChargeResult {
  provider: PaymentProviderId;
  transactionId: string;
  status: 'authorized' | 'captured' | 'pending' | 'failed';
  rawResponse?: unknown;
}

export interface RefundChargeInput {
  transactionId: string;
  amount?: MoneyAmount;
  reason?: string;
  idempotencyKey?: string;
}

export interface RefundChargeResult {
  provider: PaymentProviderId;
  refundId: string;
  status: 'pending' | 'succeeded' | 'failed';
  rawResponse?: unknown;
}

export interface VerifyWebhookInput {
  rawBody: string;
  headers: Headers | Record<string, string | null | undefined>;
}

export interface WebhookVerificationResult {
  valid: boolean;
  eventType?: string;
  transactionId?: string;
  orderId?: string;
  payload?: unknown;
}
