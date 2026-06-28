import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AdminAuthError,
  logAdminAction,
  requireAdminSession,
} from '../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { setImpersonationCookie } from '../../../../../lib/impersonation/impersonation.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';
import { ModuleDisabledError, requireModule } from '../../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  targetUid: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isSalesCommandCenterEnabled');
    if (!isModuleEnabled(flags, 'isClientImpersonationEnabled')) {
      throw new ModuleDisabledError('isClientImpersonationEnabled');
    }

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const { targetUid } = bodySchema.parse(await request.json());
    const db = getAdminFirestore();
    const targetSnap = await db.collection('users').doc(targetUid).get();
    if (!targetSnap.exists) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const target = targetSnap.data()!;
    const targetRole = String(target.role ?? 'user');
    if (targetRole !== 'user' && targetRole !== 'customer') {
      return NextResponse.json({ error: 'Can only co-browse customer accounts' }, { status: 400 });
    }

    const context = {
      aeUid: admin.uid,
      targetUid,
      targetEmail: String(target.email ?? ''),
      startedAt: new Date().toISOString(),
    };

    await logAdminAction({
      userId: admin.uid,
      action: 'impersonation_start',
      metadata: { targetUid, targetEmail: context.targetEmail },
    });

    const response = NextResponse.json({
      ok: true,
      targetEmail: context.targetEmail,
      redirectUrl: '/catalog',
    });

    const cookie = setImpersonationCookie(context);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Client impersonation is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid impersonation request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to start co-browse session' }, { status: 500 });
  }
}
