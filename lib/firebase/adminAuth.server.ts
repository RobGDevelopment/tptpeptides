import 'server-only';
import { getAdminAuth, getAdminFirestore, isAdminSdkConfigured } from './admin';
import { getSessionUserFromRequest, type SessionUser } from './auth.server';

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public statusCode: 401 | 403 | 503
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

async function isAdminUser(uid: string, idToken: string): Promise<boolean> {
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    if (decoded.admin === true || decoded.role === 'admin') return true;
  } catch {
    return false;
  }

  const db = getAdminFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  return userDoc.data()?.role === 'admin';
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

  const admin = await isAdminUser(user.uid, token);
  if (!admin) {
    throw new AdminAuthError('Forbidden', 403);
  }

  return user;
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
