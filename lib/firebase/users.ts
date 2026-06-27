import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firestore';
import type { UserRole, UserProfile } from '../../features/auth/types';

export async function ensureUserProfile(
  uid: string,
  email: string,
  role: UserRole = 'customer'
): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      uid,
      email: data.email ?? email,
      role: (data.role as UserRole) ?? 'customer',
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };
  }

  const profile: Omit<UserProfile, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    uid,
    email,
    role,
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, profile);

  return { uid, email, role, createdAt: new Date() };
}

export async function getUserRoleFromFirestore(uid: string): Promise<UserRole> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return 'customer';
  return (snapshot.data().role as UserRole) ?? 'customer';
}
