import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getActiveTenantId } from '../../../../lib/tenant/getTenant.server';
import { getClientIpAddress } from '../../../../lib/utils/requestIp.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAdminSdkConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: {
    userId?: string;
    userAgent?: string;
    ageConfirmed?: boolean;
    confirmationMethod?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (body.ageConfirmed !== true) {
    return NextResponse.json({ error: 'Age confirmation is required.' }, { status: 400 });
  }

  const userAgent = body.userAgent ?? request.headers.get('user-agent') ?? 'unknown';
  const ipAddress = getClientIpAddress(request);
  const tenantId = await getActiveTenantId();

  try {
    const db = getAdminFirestore();
    await db.collection('auditLogs').add({
      action: 'age_verification',
      type: 'age_verification',
      userId: body.userId ?? 'anonymous',
      userAgent,
      ipAddress,
      tenantId,
      ageConfirmed: true,
      confirmationMethod: body.confirmationMethod ?? 'dropdown_21_plus',
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[compliance] age verification log failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
