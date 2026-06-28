import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import {
  getVerificationByUserId,
  saveVerificationRequest,
} from '../../../../lib/firebase/verification.server';
import { uploadVerificationDocument } from '../../../../lib/firebase/storage.server';
import { ModuleDisabledError, requireB2BProcurement } from '../../../../lib/modules/b2b.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import { runMiddeskForVerification } from '../../../../lib/kyb/runMiddeskForVerification.server';
import { verificationSubmitSchema } from '../../../../lib/schemas/verification';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const flags = await getModuleFlags();
    requireB2BProcurement(flags, 'isInstitutionVerificationEnabled');

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const sessionUser = await getSessionUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verification = await getVerificationByUserId(sessionUser.uid);
    return NextResponse.json({ verification });
  } catch (error) {
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Institution verification is not available' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to load verification status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const flags = await getModuleFlags();
    requireB2BProcurement(flags, 'isInstitutionVerificationEnabled');

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const sessionUser = await getSessionUserFromRequest(request);
    if (!sessionUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await getVerificationByUserId(sessionUser.uid);
    if (existing?.status === 'pending') {
      return NextResponse.json(
        { error: 'A verification request is already pending review.' },
        { status: 409 }
      );
    }
    if (existing?.status === 'approved') {
      return NextResponse.json({ error: 'Your institution is already verified.' }, { status: 409 });
    }

    const formData = await request.formData();
    const institutionName = String(formData.get('institutionName') ?? '');
    const einTaxId = String(formData.get('einTaxId') ?? '');
    const labType = String(formData.get('labType') ?? '');
    const file = formData.get('document');

    const parsed = verificationSubmitSchema.safeParse({ institutionName, einTaxId, labType });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid verification data' },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Upload a W-9 or institutional letter (PDF/JPG/PNG).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { storagePath } = await uploadVerificationDocument({
      userId: sessionUser.uid,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    });

    let addressLine: string | null = null;
    const { getAdminFirestore } = await import('../../../../lib/firebase/admin');
    const userSnap = await getAdminFirestore().collection('users').doc(sessionUser.uid).get();
    const shippingAddress = userSnap.data()?.shippingAddress as
      | {
          line1?: string;
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        }
      | undefined;
    if (shippingAddress?.line1 && shippingAddress?.city && shippingAddress?.state) {
      addressLine = [
        shippingAddress.line1,
        shippingAddress.city,
        shippingAddress.state,
        shippingAddress.postalCode,
        shippingAddress.country ?? 'US',
      ]
        .filter(Boolean)
        .join(', ');
    }

    const middesk = await runMiddeskForVerification({
      flags,
      userId: sessionUser.uid,
      institutionName: parsed.data.institutionName,
      einTaxId: parsed.data.einTaxId,
      addressLine,
    });

    await saveVerificationRequest({
      userId: sessionUser.uid,
      email: sessionUser.email,
      institutionName: parsed.data.institutionName,
      einTaxId: parsed.data.einTaxId,
      labType: parsed.data.labType,
      documentStoragePath: storagePath,
      documentFileName: file.name,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      ...(middesk ? { middesk } : {}),
    });

    await getAdminFirestore().collection('auditLogs').add({
      type: 'verification_review',
      userId: sessionUser.uid,
      action: 'verification_submitted',
      metadata: {
        institutionName: parsed.data.institutionName,
        middeskRecommendation: middesk?.recommendation,
        middeskEnabled: isModuleEnabled(flags, 'isMiddeskVerificationEnabled'),
      },
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Institution verification is not available' }, { status: 404 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to submit verification' }, { status: 500 });
  }
}
