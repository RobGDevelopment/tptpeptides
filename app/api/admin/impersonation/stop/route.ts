import { NextResponse } from 'next/server';
import {
  AdminAuthError,
  logAdminAction,
  requireAdminSession,
} from '../../../../../lib/firebase/adminAuth.server';
import {
  clearImpersonationCookie,
  impersonationMatchesSession,
  readImpersonationFromRequest,
} from '../../../../../lib/impersonation/impersonation.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const flags = await getModuleFlags();
    if (
      !isModuleEnabled(flags, 'isSalesCommandCenterEnabled') ||
      !isModuleEnabled(flags, 'isClientImpersonationEnabled')
    ) {
      return NextResponse.json({ error: 'Co-browse is not enabled' }, { status: 404 });
    }

    const admin = await requireAdminSession(request);
    const active = impersonationMatchesSession(readImpersonationFromRequest(request), admin.uid);

    if (active) {
      await logAdminAction({
        userId: admin.uid,
        action: 'impersonation_stop',
        metadata: { targetUid: active.targetUid },
      });
    }

    const response = NextResponse.json({ ok: true });
    const cookie = clearImpersonationCookie();
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to stop co-browse session' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const flags = await getModuleFlags();
    if (
      !isModuleEnabled(flags, 'isSalesCommandCenterEnabled') ||
      !isModuleEnabled(flags, 'isClientImpersonationEnabled')
    ) {
      return NextResponse.json({ active: false });
    }

    const admin = await requireAdminSession(request);
    const active = impersonationMatchesSession(readImpersonationFromRequest(request), admin.uid);

    if (!active) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      targetUid: active.targetUid,
      targetEmail: active.targetEmail,
      startedAt: active.startedAt,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ active: false });
  }
}
