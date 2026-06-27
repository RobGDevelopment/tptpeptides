import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { app } from './firebaseConfig';
import { syncAuthSession } from './session';
import { ensureUserProfile } from './users';

export const auth = getAuth(app);

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(userCredential.user.uid, userCredential.user.email ?? email);
  const idToken = await userCredential.user.getIdToken();
  await syncAuthSession(idToken);
  return userCredential.user;
};

export const registerUser = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(userCredential.user.uid, email, 'customer');
  await sendEmailVerification(userCredential.user);
  const idToken = await userCredential.user.getIdToken();
  await syncAuthSession(idToken);
  return userCredential.user;
};

export const logoutUser = async () => {
  await syncAuthSession(null);
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const idToken = await user.getIdToken();
      await syncAuthSession(idToken);
    } else {
      await syncAuthSession(null);
    }
    callback(user);
  });
};

export const resolveUserRole = async (user: User): Promise<'customer' | 'admin'> => {
  const tokenResult = await user.getIdTokenResult();
  if (tokenResult.claims.admin === true) return 'admin';
  if (tokenResult.claims.role === 'admin') return 'admin';

  const { getUserRoleFromFirestore } = await import('./users');
  return getUserRoleFromFirestore(user.uid);
};
