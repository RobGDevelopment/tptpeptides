import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { findComplianceViolations } from '../../../../../lib/compliance/copyGuard';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../lib/firebase/admin';
import { CMS_PATHS } from '../../../../../lib/firebase/storefrontCms.server';
import { protocolTemplateCmsSchema } from '../../../../../lib/schemas/storefrontCms';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const snapshot = await getAdminFirestore().collection(CMS_PATHS.protocols).get();
    const protocols = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ protocols });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to load protocols' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const protocol = protocolTemplateCmsSchema.parse(await request.json());
    const violations = findComplianceViolations(protocol.focus);
    if (violations.length > 0) {
      return NextResponse.json(
        { error: `Non-compliant copy: ${violations.join(', ')}` },
        { status: 400 }
      );
    }

    const { id, ...data } = protocol;
    await getAdminFirestore()
      .collection(CMS_PATHS.protocols)
      .doc(id)
      .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    await logAdminAction({
      userId: admin.uid,
      action: 'cms_protocol_save',
      metadata: { id },
    });

    revalidatePath('/protocols');
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid protocol' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to save protocol' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await getAdminFirestore().collection(CMS_PATHS.protocols).doc(id).delete();
    await logAdminAction({ userId: admin.uid, action: 'cms_protocol_delete', metadata: { id } });
    revalidatePath('/protocols');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to delete protocol' }, { status: 500 });
  }
}
