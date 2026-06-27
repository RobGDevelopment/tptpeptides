import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firestore';
import {
  accessLevelForRole,
  normalizeUserRole,
  type UserRole,
} from '../schemas/user';
import type { UserProfile } from '../../features/auth/types';

export async function ensureUserProfile(
  uid: string,
  email: string,
  role: UserRole = 'user'
): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      uid,
      email: data.email ?? email,
      role: normalizeUserRole(data.role as string | undefined),
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };
  }

  const profile = {
    uid,
    email,
    role,
    accessLevel: accessLevelForRole(role),
    disabled: false,
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, profile);

  return { uid, email, role, createdAt: new Date() };
}

export async function getUserRoleFromFirestore(uid: string): Promise<UserRole> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return 'user';
  return normalizeUserRole(snapshot.data().role as string | undefined);
}
