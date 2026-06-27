import 'server-only';

import { isMasterAdminEmail } from '../admin/masterAdmin';
import { resolveServerAdminAccess } from '../admin/resolveAdminAccess.server';
import type { UserRbacProfile } from './users.server';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';
import { getSessionUserFromRequest, type SessionUser } from './auth.server';
import { getUserRbacProfile } from './users.server';

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public statusCode: 401 | 403 | 503
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

function masterAdminProfile(session: SessionUser): UserRbacProfile {
  return {
    uid: session.uid,
    email: session.email ?? null,
    role: 'admin',
    accessLevel: 100,
    disabled: false,
    lastActive: null,
    createdBy: null,
    loyaltyPoints: 0,
    totalPointsEarned: 0,
  };
}

async function isAdminUser(uid: string, email: string | undefined, idToken: string): Promise<boolean> {
  return resolveServerAdminAccess({ uid, email, idToken });
}

export async function requireAdminSession(request: Request): Promise<SessionUser> {
  if (!isAdminSdkConfigured()) {
    throw new AdminAuthError('Admin SDK not configured', 503);
  }

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    throw new AdminAuthError('Unauthorized', 401);
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/(?:^|; )tpt-auth=([^;]*)/);
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;

  if (!token) {
    throw new AdminAuthError('Unauthorized', 401);
  }

  const admin = await isAdminUser(user.uid, user.email, token);
  if (!admin) {
    throw new AdminAuthError('Forbidden', 403);
  }

  if (!isMasterAdminEmail(user.email)) {
    const profile = await getUserRbacProfile(user.uid);
    if (profile?.disabled) {
      throw new AdminAuthError('Account disabled', 403);
    }
  }

  return user;
}

/** Returns RBAC profile for the authenticated admin session. */
export async function requireAdminSessionWithProfile(request: Request) {
  const session = await requireAdminSession(request);
  let profile = await getUserRbacProfile(session.uid);

  if (!profile && isMasterAdminEmail(session.email)) {
    profile = masterAdminProfile(session);
  }

  if (!profile) {
    throw new AdminAuthError('User profile not found', 403);
  }

  return { session, profile };
}

export async function logAdminAction(params: {
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('auditLogs').add({
    type: 'admin_action',
    action: params.action,
    userId: params.userId,
    metadata: params.metadata ?? {},
    timestamp: new Date(),
  });
}
