import { NextResponse } from 'next/server';
import { postClinicPaymentEvent } from '../../../../lib/clinic/finance/postPaymentEvent.server';
import { IntegrationNotConfiguredError } from '../../../../lib/integrations/errors';
import { resolveIntegration } from '../../../../lib/integrations/resolver.server';
import {
  parseNmiClinicWebhookPayload,
  resolveNmiWebhookSigningSecret,
  verifyNmiWebhookSignature,
} from '../../../../lib/integrations/providers/nmi.adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();

  let signingSecret: string | null = null;

  try {
    const resolved = await resolveIntegration('nmi', { fallbackEnv: false });
    signingSecret = resolveNmiWebhookSigningSecret(resolved);
  } catch (error) {
    if (!(error instanceof IntegrationNotConfiguredError)) {
      console.error('[webhook/clinic-nmi] integration resolve failed', error);
      return NextResponse.json({ error: 'Integration resolution failed' }, { status: 500 });
    }
    signingSecret = resolveNmiWebhookSigningSecret(null);
  }

  if (!signingSecret) {
    return NextResponse.json(
      { error: 'NMI webhook signing secret is not configured' },
      { status: 503 }
    );
  }

  const signatureValid = verifyNmiWebhookSignature({
    rawBody,
    headers: request.headers,
    signingSecret,
  });

  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const parsed = parseNmiClinicWebhookPayload(rawBody);
  if (!parsed) {
    return NextResponse.json({ received: true, skipped: 'unrecognized clinic NMI event' });
  }

  try {
    const result = await postClinicPaymentEvent({
      idempotencyKey: parsed.idempotencyKey,
      eventType: parsed.eventType,
      paymentGateway: 'nmi',
      gatewayTransactionId: parsed.gatewayTransactionId,
      gatewayBatchId: parsed.gatewayBatchId,
      subscriptionId: parsed.subscriptionId,
      patientId: parsed.patientId,
      amountCents: parsed.amountCents,
      currency: parsed.currency,
      rawPayload: parsed.rawPayload,
      enqueueQboSync: true,
    });

    return NextResponse.json({
      received: true,
      paymentEventId: result.paymentEventId,
      entryGroupId: result.entryGroupId,
      idempotentReplay: result.idempotentReplay,
      qboQueueId: result.qboQueueId,
    });
  } catch (error) {
    console.error('[webhook/clinic-nmi] ledger ingest failed', error);
    return NextResponse.json({ error: 'Clinic ledger ingest failed' }, { status: 500 });
  }
}
