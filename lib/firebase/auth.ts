import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { app } from './firebaseConfig';
import { syncAuthSession } from './session';
import { ensureUserProfile } from './users';

export const auth = getAuth(app);

async function syncSessionWithClaimsRefresh(user: User): Promise<boolean> {
  let idToken = await user.getIdToken();
  let result = await syncAuthSession(idToken);

  if (result.refreshClaims) {
    idToken = await user.getIdToken(true);
    result = await syncAuthSession(idToken);
  }

  return result.isAdmin;
}

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(userCredential.user.uid, userCredential.user.email ?? email);
  await syncSessionWithClaimsRefresh(userCredential.user);
  return userCredential.user;
};

export const registerUser = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(userCredential.user.uid, email, 'user');
  await sendEmailVerification(userCredential.user);
  await syncSessionWithClaimsRefresh(userCredential.user);
  return userCredential.user;
};

export const logoutUser = async () => {
  await syncAuthSession(null);
  await signOut(auth);
};

export const sendPasswordReset = async (email: string) => {
  await sendPasswordResetEmail(auth, email.trim());
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      await syncSessionWithClaimsRefresh(user);
    } else {
      await syncAuthSession(null);
    }
    callback(user);
  });
};

import type { UserRole } from '../schemas/user';
import { normalizeUserRole } from '../schemas/user';

export const resolveUserRole = async (user: User): Promise<UserRole> => {
  const tokenResult = await user.getIdTokenResult();
  if (tokenResult.claims.admin === true) return 'admin';
  if (tokenResult.claims.role === 'admin') return 'admin';

  const { getUserRoleFromFirestore } = await import('./users');
  return getUserRoleFromFirestore(user.uid);
};
