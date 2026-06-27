import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAdminSdkConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: { userId?: string; userAgent?: string };
  try {
    body = (await request.json()) as { userId?: string; userAgent?: string };
  } catch {
    body = {};
  }

  const userAgent = body.userAgent ?? request.headers.get('user-agent') ?? 'unknown';

  try {
    const db = getAdminFirestore();
    await db.collection('auditLogs').add({
      action: 'age_verification',
      type: 'age_verification',
      userId: body.userId ?? 'anonymous',
      userAgent,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[compliance] age verification log failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
