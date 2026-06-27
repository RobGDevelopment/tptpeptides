import 'server-only';

import { getAdminAuth, isAdminSdkConfigured } from './admin';
import { AUTH_SESSION_MAX_AGE_SEC } from './authConstants';

export interface VerifiedSession {
  uid: string;
  email?: string;
}

/** Mint a compact Firebase session cookie from a client id token. */
export async function createAuthSessionCookie(idToken: string): Promise<string | null> {
  if (!isAdminSdkConfigured()) return null;

  try {
    const auth = getAdminAuth();
    return await auth.createSessionCookie(idToken, {
      expiresIn: AUTH_SESSION_MAX_AGE_SEC * 1000,
    });
  } catch (error) {
    console.error('[auth] createSessionCookie failed', error);
    return null;
  }
}

/** Verify session cookie or legacy raw id token stored in the auth cookie. */
export async function verifyAuthSessionCookie(token: string): Promise<VerifiedSession | null> {
  if (!isAdminSdkConfigured() || !token.trim()) return null;

  const decodedToken = decodeURIComponent(token);

  try {
    const auth = getAdminAuth();
    try {
      const decoded = await auth.verifySessionCookie(decodedToken, true);
      return { uid: decoded.uid, email: decoded.email };
    } catch {
      // Legacy deployments stored the raw Firebase id token in this cookie.
      try {
        const decoded = await auth.verifyIdToken(decodedToken, true);
        return { uid: decoded.uid, email: decoded.email };
      } catch {
        return null;
      }
    }
  } catch (error) {
    console.error('[auth] verifyAuthSessionCookie failed', error);
    return null;
  }
}
