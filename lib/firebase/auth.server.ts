import 'server-only';
import { cookies } from 'next/headers';
import { getAdminAuth, isAdminSdkConfigured } from './admin';

export const AUTH_SESSION_COOKIE = 'tpt-auth';

export interface SessionUser {
  uid: string;
  email?: string;
}

export async function getSessionUserFromCookies(): Promise<SessionUser | null> {
  if (!isAdminSdkConfigured()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

export async function getSessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  if (!isAdminSdkConfigured()) return null;
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_SESSION_COOKIE}=([^;]*)`));
  const token = match?.[1];
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(decodeURIComponent(token));
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
