import { NextResponse } from 'next/server';
import { resolveServerAdminAccess } from '../../../../lib/admin/resolveAdminAccess.server';
import { syncMasterAdminAccess } from '../../../../lib/admin/syncMasterAdmin.server';
import { isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { touchUserLastActive } from '../../../../lib/firebase/users.server';

export const AUTH_SESSION_COOKIE = 'tpt-auth';

export async function POST(request: Request) {
  const body = (await request.json()) as { idToken?: string };
  if (!body.idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  let isAdmin = false;
  let refreshClaims = false;

  if (isAdminSdkConfigured()) {
    try {
      const { getAdminAuth } = await import('../../../../lib/firebase/admin');
      const decoded = await getAdminAuth().verifyIdToken(body.idToken);
      refreshClaims = await syncMasterAdminAccess(decoded.uid, decoded.email);
      void touchUserLastActive(decoded.uid);
      isAdmin = await resolveServerAdminAccess({
        uid: decoded.uid,
        email: decoded.email,
        idToken: body.idToken,
      });
    } catch (error) {
      console.error('[auth/session] failed to sync session', error);
    }
  }

  const response = NextResponse.json({ ok: true, isAdmin, refreshClaims });
  response.cookies.set(AUTH_SESSION_COOKIE, body.idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
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
