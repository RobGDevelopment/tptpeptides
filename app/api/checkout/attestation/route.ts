import { NextResponse } from 'next/server';
import {
  attestationApiRequestSchema,
  B2B_ATTESTATION_PHRASE,
  RESEARCH_INTENT_OPTIONS,
} from '../../../../lib/schemas/attestation';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import {
  AttestationValidationError,
  createAttestationLog,
} from '../../../../lib/firebase/attestation.server';
import { isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import { getActiveTenantId } from '../../../../lib/tenant/getTenant.server';
import { getClientIpAddress } from '../../../../lib/utils/requestIp.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAdminSdkConfigured()) {
    return NextResponse.json({ error: 'Attestation service is not configured.' }, { status: 503 });
  }

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTypedAttestationEnabled')) {
    return NextResponse.json({ error: 'Typed attestation is not enabled.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = attestationApiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid attestation request' },
      { status: 400 }
    );
  }

  try {
    const sessionUser = await getSessionUserFromRequest(request);
    const tenantId = await getActiveTenantId();
    const ipAddress = getClientIpAddress(request);
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    const { id } = await createAttestationLog({
      requiredPhrase: B2B_ATTESTATION_PHRASE,
      typedSignature: parsed.data.typedSignature,
      researchIntent: parsed.data.researchIntent,
      uid: sessionUser?.uid ?? null,
      ipAddress,
      userAgent,
      tenantId,
    });

    return NextResponse.json({
      attestationLogId: id,
      requiredPhrase: B2B_ATTESTATION_PHRASE,
    });
  } catch (error) {
    if (error instanceof AttestationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[checkout/attestation] failed', error);
    return NextResponse.json({ error: 'Unable to record attestation' }, { status: 500 });
  }
}

export async function GET() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTypedAttestationEnabled')) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    requiredPhrase: B2B_ATTESTATION_PHRASE,
    researchIntentOptions: RESEARCH_INTENT_OPTIONS,
  });
}