import 'server-only';

import { isMasterAdminEmail } from './masterAdmin';
import { getAdminAuth, getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import { normalizeUserRole } from '../schemas/user';

/** Server-only admin resolution: master email bypass, claims, then Firestore role. */
export async function resolveServerAdminAccess(params: {
  uid: string;
  email?: string | null;
  idToken: string;
}): Promise<boolean> {
  if (isMasterAdminEmail(params.email)) return true;

  if (!isAdminSdkConfigured()) return false;

  if (params.idToken) {
    try {
      const auth = getAdminAuth();
      let decoded;
      try {
        decoded = await auth.verifySessionCookie(params.idToken, true);
      } catch {
        decoded = await auth.verifyIdToken(params.idToken);
      }
      if (isMasterAdminEmail(decoded.email)) return true;
      if (decoded.admin === true || decoded.role === 'admin') return true;
    } catch {
      return false;
    }
  }

  try {
    const userDoc = await getAdminFirestore().collection('users').doc(params.uid).get();
    const data = userDoc.data();
    if (data?.disabled === true) return false;
    return normalizeUserRole(data?.role as string | undefined) === 'admin';
  } catch (error) {
    console.error('[admin] resolveServerAdminAccess Firestore lookup failed', error);
    return false;
  }
}
