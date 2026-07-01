import { NextResponse } from 'next/server';
import { syncFullscriptLabOrderToClinicResults } from '../../../../lib/integrations/fullscript/labOrderSync.server';
import { IntegrationNotConfiguredError } from '../../../../lib/integrations/errors';
import { resolveIntegration } from '../../../../lib/integrations/resolver.server';
import {
  parseFullscriptWebhookPayload,
  resolveFullscriptWebhookSigningSecret,
  verifyFullscriptWebhookSignature,
} from '../../../../lib/integrations/providers/fullscript.adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();

  let signingSecret: string | null = null;

  try {
    const resolved = await resolveIntegration('fullscript', { fallbackEnv: false });
    signingSecret = resolveFullscriptWebhookSigningSecret(resolved);
  } catch (error) {
    if (!(error instanceof IntegrationNotConfiguredError)) {
      console.error('[webhook/fullscript] integration resolve failed', error);
      return NextResponse.json({ error: 'Integration resolution failed' }, { status: 500 });
    }
    signingSecret = resolveFullscriptWebhookSigningSecret(null);
  }

  if (!signingSecret) {
    return NextResponse.json(
      { error: 'Fullscript webhook signing secret is not configured' },
      { status: 503 }
    );
  }

  const signatureValid = verifyFullscriptWebhookSignature({
    rawBody,
    headers: request.headers,
    signingSecret,
  });

  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const parsed = parseFullscriptWebhookPayload(rawBody);
  if (!parsed) {
    return NextResponse.json({ received: true, skipped: 'unrecognized Fullscript event' });
  }

  try {
    const result = await syncFullscriptLabOrderToClinicResults(parsed);

    if (!result) {
      return NextResponse.json({
        received: true,
        skipped: 'patient_not_resolved',
        orderId: parsed.orderId,
      });
    }

    return NextResponse.json({
      received: true,
      labResultId: result.labResultId,
      patientId: result.patientId,
      idempotentReplay: result.idempotentReplay,
    });
  } catch (error) {
    console.error('[webhook/fullscript] lab sync failed', error);
    return NextResponse.json({ error: 'Fullscript lab sync failed' }, { status: 500 });
  }
}
