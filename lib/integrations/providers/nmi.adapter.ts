import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ClinicPaymentEventType } from '../../schemas/clinicLedger';
import { amountToCents } from '../../schemas/clinicLedger';
import type { ResolvedIntegration } from '../types';

export type NmiClinicWebhookEvent = {
  eventType: ClinicPaymentEventType;
  idempotencyKey: string;
  gatewayTransactionId: string | null;
  gatewayBatchId: string | null;
  amountCents: number;
  currency: string;
  subscriptionId: string | null;
  patientId: string | null;
  rawPayload: Record<string, unknown>;
};

export type NmiWebhookVerificationInput = {
  rawBody: string;
  headers: Headers | Record<string, string | null | undefined>;
  signingSecret: string;
};

function headerValue(
  headers: NmiWebhookVerificationInput['headers'],
  name: string
): string | null {
  if (headers instanceof Headers) {
    return headers.get(name);
  }
  const direct = headers[name] ?? headers[name.toLowerCase()];
  return direct?.trim() || null;
}

function parsePayload(rawBody: string): Record<string, unknown> {
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    const params = new URLSearchParams(rawBody.trim());
    const out: Record<string, unknown> = {};
    params.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
}

function readString(payload: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function readAmountCents(payload: Record<string, unknown>): number | null {
  const amountRaw =
    readString(payload, 'amount', 'transaction_amount', 'authorized_amount') ??
    (typeof payload.amount === 'number' ? String(payload.amount) : null);

  if (!amountRaw) return null;

  const parsed = Number(amountRaw);
  if (!Number.isFinite(parsed) || parsed === 0) return null;

  if (amountRaw.includes('.')) {
    return amountToCents(parsed);
  }

  return Math.round(parsed);
}

function mapNmiEventType(payload: Record<string, unknown>): ClinicPaymentEventType | null {
  const eventType = (readString(payload, 'event_type', 'type', 'action') ?? '').toLowerCase();

  if (eventType.includes('chargeback') || eventType.includes('dispute')) {
    return 'chargeback';
  }
  if (eventType.includes('refund') || eventType.includes('void')) {
    return 'subscription_refund';
  }
  if (eventType.includes('fee')) {
    return 'merchant_fee';
  }
  if (eventType.includes('settlement') || eventType.includes('deposit')) {
    return 'settlement_transfer';
  }
  if (eventType.includes('reserve_release') || eventType.includes('reserve release')) {
    return 'rolling_reserve_release';
  }
  if (eventType.includes('reserve')) {
    return 'rolling_reserve_hold';
  }
  if (
    eventType.includes('sale') ||
    eventType.includes('charge') ||
    eventType.includes('capture') ||
    eventType.includes('approved') ||
    eventType.includes('payment')
  ) {
    return 'subscription_charge';
  }

  const responseCode = readString(payload, 'response', 'response_code');
  if (responseCode === '1') {
    return 'subscription_charge';
  }

  return null;
}

export function verifyNmiWebhookSignature(input: NmiWebhookVerificationInput): boolean {
  const signature =
    headerValue(input.headers, 'x-nmi-signature') ?? headerValue(input.headers, 'signature');

  if (!signature?.trim() || !input.signingSecret.trim()) {
    return false;
  }

  const digest = createHmac('sha256', input.signingSecret.trim())
    .update(input.rawBody)
    .digest('hex');

  const provided = signature.trim().replace(/^sha256=/i, '');

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(provided));
  } catch {
    return digest === provided;
  }
}

export function resolveNmiWebhookSigningSecret(
  resolved: ResolvedIntegration | null
): string | null {
  const fromIntegration = resolved?.secrets.webhookSigningSecret?.trim();
  if (fromIntegration) return fromIntegration;

  const fromEnv = process.env.NMI_WEBHOOK_SIGNING_KEY?.trim();
  return fromEnv || null;
}

export function parseNmiClinicWebhookPayload(rawBody: string): NmiClinicWebhookEvent | null {
  const payload = parsePayload(rawBody);
  const mappedType = mapNmiEventType(payload);
  if (!mappedType) return null;

  const gatewayTransactionId = readString(
    payload,
    'transaction_id',
    'transactionid',
    'transactionId'
  );
  const gatewayBatchId = readString(payload, 'batch_id', 'batchid', 'settlement_batch_id');
  const amountCents = readAmountCents(payload);
  if (amountCents == null) return null;

  const signedAmount =
    mappedType === 'subscription_refund' || mappedType === 'chargeback'
      ? -Math.abs(amountCents)
      : amountCents;

  const eventId = readString(payload, 'event_id', 'eventid', 'id');
  const idempotencyKey =
    eventId ??
    [mappedType, gatewayTransactionId ?? 'unknown', gatewayBatchId ?? ''].filter(Boolean).join(':');

  const subscriptionId = readString(
    payload,
    'subscription_id',
    'subscriptionid',
    'merchant_defined_field_3'
  );
  const patientId = readString(payload, 'patient_id', 'customer_id', 'merchant_defined_field_4');

  const currency = (readString(payload, 'currency') ?? 'USD').toUpperCase();

  return {
    eventType: mappedType,
    idempotencyKey,
    gatewayTransactionId,
    gatewayBatchId,
    amountCents: signedAmount,
    currency,
    subscriptionId,
    patientId,
    rawPayload: payload,
  };
}

export async function testNmiConnection(
  _resolved: ResolvedIntegration
): Promise<{ ok: boolean; detail?: string; error?: string }> {
  return {
    ok: true,
    detail: 'NMI adapter scaffold ready — configure webhook signing secret and gateway credentials.',
  };
}
