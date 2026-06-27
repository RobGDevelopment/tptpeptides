import 'server-only';

import { cookies } from 'next/headers';
import { AUTH_SESSION_COOKIE } from './authConstants';
import { verifyAuthSessionCookie } from './sessionCookie.server';

export { AUTH_SESSION_COOKIE } from './authConstants';

export interface SessionUser {
  uid: string;
  email?: string;
}

export async function getSessionUserFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAuthSessionCookie(token);
}

export async function getSessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_SESSION_COOKIE}=([^;]*)`));
  const token = match?.[1];
  if (!token) return null;

  return verifyAuthSessionCookie(token);
}
