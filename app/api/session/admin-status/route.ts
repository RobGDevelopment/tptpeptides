import { NextResponse } from 'next/server';
import { resolveServerAdminAccess } from '../../../../lib/admin/resolveAdminAccess.server';
import { isMasterAdminEmail } from '../../../../lib/admin/masterAdmin';
import { AUTH_SESSION_COOKIE } from '../../../../lib/firebase/authConstants';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ isAdmin: false, isMasterAdmin: false });
    }

    const cookieHeader = request.headers.get('cookie') ?? '';
    const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_SESSION_COOKIE}=([^;]*)`));
    const token = match?.[1] ? decodeURIComponent(match[1]) : null;

    if (!token) {
      return NextResponse.json({
        isAdmin: isMasterAdminEmail(user.email),
        isMasterAdmin: isMasterAdminEmail(user.email),
      });
    }

    const isAdmin = await resolveServerAdminAccess({
      uid: user.uid,
      email: user.email,
      idToken: token,
    });

    return NextResponse.json({
      isAdmin,
      isMasterAdmin: isMasterAdminEmail(user.email),
    });
  } catch (error) {
    console.error('[session/admin-status] GET failed', error);
    return NextResponse.json({ isAdmin: false, isMasterAdmin: false });
  }
}
