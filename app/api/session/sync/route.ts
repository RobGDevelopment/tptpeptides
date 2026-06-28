import { NextResponse } from 'next/server';
import { resolveServerAdminAccess } from '../../../../lib/admin/resolveAdminAccess.server';
import { syncMasterAdminAccess } from '../../../../lib/admin/syncMasterAdmin.server';
import { isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { AUTH_SESSION_COOKIE, AUTH_SESSION_MAX_AGE_SEC } from '../../../../lib/firebase/authConstants';
import { createAuthSessionCookie } from '../../../../lib/firebase/sessionCookie.server';
import { touchUserLastActive } from '../../../../lib/firebase/users.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    if (!body.idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    let isAdmin = false;
    let refreshClaims = false;
    let sessionCookie = body.idToken;

    if (isAdminSdkConfigured()) {
      try {
        const { getAdminAuth } = await import('../../../../lib/firebase/admin');
        const decoded = await getAdminAuth().verifyIdToken(body.idToken);
        refreshClaims = await syncMasterAdminAccess(decoded.uid, decoded.email);
        void touchUserLastActive(decoded.uid);
        void import('../../../../lib/sales/leadRouting.server').then(({ routeLeadForUser }) =>
          routeLeadForUser(decoded.uid, decoded.email)
        );
        isAdmin = await resolveServerAdminAccess({
          uid: decoded.uid,
          email: decoded.email,
          idToken: body.idToken,
        });

        const minted = await createAuthSessionCookie(body.idToken);
        if (minted) {
          sessionCookie = minted;
        }
      } catch (error) {
        console.error('[session/sync] failed to sync session', error);
      }
    }

    const response = NextResponse.json({ ok: true, isAdmin, refreshClaims });
    response.cookies.set(AUTH_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_SESSION_MAX_AGE_SEC,
    });
    return response;
  } catch (error) {
    console.error('[session/sync] POST failed', error);
    return NextResponse.json({ ok: false, isAdmin: false, refreshClaims: false }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
