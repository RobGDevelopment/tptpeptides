import 'server-only';

import { randomBytes } from 'crypto';
import {
  accessLevelForRole,
  normalizeUserRole,
  type UserRole,
} from '../schemas/user';
import { getAdminAuth, getAdminFirestore, isAdminSdkConfigured } from './admin';

export interface UserRbacProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  accessLevel: number;
  disabled: boolean;
  lastActive: string | null;
  createdBy: string | null;
  loyaltyPoints: number;
  totalPointsEarned: number;
}

function mapUserDoc(uid: string, data: Record<string, unknown>): UserRbacProfile {
  const role = normalizeUserRole(data.role as string | undefined);
  return {
    uid,
    email: (data.email as string | undefined) ?? null,
    role,
    accessLevel: Number(data.accessLevel ?? accessLevelForRole(role)),
    disabled: Boolean(data.disabled ?? false),
    lastActive: (data.lastActive as string | undefined) ?? null,
    createdBy: (data.createdBy as string | undefined) ?? null,
    loyaltyPoints: Number(data.loyaltyPoints ?? 0),
    totalPointsEarned: Number(data.totalPointsEarned ?? 0),
  };
}

export async function getUserRbacProfile(uid: string): Promise<UserRbacProfile | null> {
  if (!isAdminSdkConfigured()) return null;
  const doc = await getAdminFirestore().collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return mapUserDoc(doc.id, doc.data() ?? {});
}

export async function touchUserLastActive(uid: string): Promise<void> {
  if (!isAdminSdkConfigured()) return;
  await getAdminFirestore()
    .collection('users')
    .doc(uid)
    .set({ lastActive: new Date().toISOString() }, { merge: true });
}

export async function createInvitedUser(params: {
  email: string;
  role: Exclude<UserRole, 'user'>;
  createdBy: string;
}): Promise<{ uid: string; resetLink: string }> {
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const tempPassword = randomBytes(24).toString('base64url');

  const userRecord = await auth.createUser({
    email: params.email,
    password: tempPassword,
    emailVerified: false,
  });

  const accessLevel = accessLevelForRole(params.role);
  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email: params.email,
    role: params.role,
    accessLevel,
    disabled: false,
    createdBy: params.createdBy,
    createdAt: new Date().toISOString(),
    lastActive: null,
    loyaltyPoints: 0,
    totalPointsEarned: 0,
  });

  const resetLink = await auth.generatePasswordResetLink(params.email);
  return { uid: userRecord.uid, resetLink };
}

export async function listUsersForAdmin(limit = 200): Promise<UserRbacProfile[]> {
  const snapshot = await getAdminFirestore().collection('users').limit(limit).get();
  return snapshot.docs.map((doc) => mapUserDoc(doc.id, doc.data()));
}
