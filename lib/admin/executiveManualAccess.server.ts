import 'server-only';

import { cookies } from 'next/headers';
import { isMasterAdminEmail } from './masterAdmin';
import { getAdminAuth, getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import { AUTH_SESSION_COOKIE } from '../firebase/authConstants';
import { getSessionUserFromCookies } from '../firebase/auth.server';
import { getUserRbacProfile } from '../firebase/users.server';
import { normalizeUserRole } from '../schemas/user';

export interface ExecutiveManualAccess {
  allowed: boolean;
  isSuperAdmin: boolean;
  isPartner: boolean;
}

async function decodeSessionClaims(token: string): Promise<Record<string, unknown> | null> {
  if (!isAdminSdkConfigured()) return null;

  const decodedToken = decodeURIComponent(token);
  const auth = getAdminAuth();

  try {
    const decoded = await auth.verifySessionCookie(decodedToken, true);
    return decoded as Record<string, unknown>;
  } catch {
    try {
      const decoded = await auth.verifyIdToken(decodedToken, true);
      return decoded as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export function claimsIndicatePartner(claims: Record<string, unknown> | null): boolean {
  if (!claims) return false;
  if (claims.partner === true) return true;
  if (claims.role === 'partner') return true;
  return false;
}

export function claimsIndicateSuperAdmin(
  claims: Record<string, unknown> | null,
  firestoreRole?: string | null
): boolean {
  if (isMasterAdminEmail(typeof claims?.email === 'string' ? claims.email : undefined)) return true;
  if (claims?.admin === true) return true;
  if (claims?.role === 'admin') return true;
  if (normalizeUserRole(firestoreRole) === 'admin') return true;
  return false;
}

/** Super Admin or ownership partner (`partner` custom claim / legacy role). */
export async function resolveExecutiveManualAccess(): Promise<ExecutiveManualAccess> {
  const session = await getSessionUserFromCookies();
  if (!session) {
    return { allowed: false, isSuperAdmin: false, isPartner: false };
  }

  if (isMasterAdminEmail(session.email)) {
    return { allowed: true, isSuperAdmin: true, isPartner: false };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value ?? '';
  const claims = token ? await decodeSessionClaims(token) : null;
  const profile = await getUserRbacProfile(session.uid);

  const isPartner = claimsIndicatePartner(claims);
  const isSuperAdmin = claimsIndicateSuperAdmin(claims, profile?.role);

  if (isSuperAdmin || isPartner) {
    return { allowed: true, isSuperAdmin, isPartner };
  }

  // Firestore legacy partner role (pre-claims migration)
  if (profile?.role) {
    const rawSnap = isAdminSdkConfigured()
      ? await getAdminFirestore().collection('users').doc(session.uid).get()
      : null;
    const rawRole = rawSnap?.data()?.role;
    if (rawRole === 'partner') {
      return { allowed: true, isSuperAdmin: false, isPartner: true };
    }
  }

  return { allowed: false, isSuperAdmin: false, isPartner: false };
}
