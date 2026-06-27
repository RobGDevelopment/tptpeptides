import 'server-only';

import { isMasterAdminEmail } from './masterAdmin';
import { getAdminAuth, getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';

/** Grants master admins Firebase custom claims + Firestore profile for client-side rules. */
export async function syncMasterAdminAccess(
  uid: string,
  email: string | undefined
): Promise<boolean> {
  if (!isMasterAdminEmail(email) || !isAdminSdkConfigured()) return false;

  const auth = getAdminAuth();
  const db = getAdminFirestore();

  await auth.setCustomUserClaims(uid, { admin: true, role: 'admin' });
  await db.collection('users').doc(uid).set(
    {
      uid,
      email: email ?? null,
      role: 'admin',
      accessLevel: 100,
      disabled: false,
    },
    { merge: true }
  );

  return true;
}
