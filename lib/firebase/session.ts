export const AUTH_SESSION_COOKIE = 'tpt-auth';

export interface AuthSessionSyncResult {
  isAdmin: boolean;
  refreshClaims: boolean;
}

async function postSession(idToken: string): Promise<AuthSessionSyncResult> {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    return { isAdmin: false, refreshClaims: false };
  }

  const data = (await response.json()) as {
    isAdmin?: boolean;
    refreshClaims?: boolean;
  };

  return {
    isAdmin: Boolean(data.isAdmin),
    refreshClaims: Boolean(data.refreshClaims),
  };
}

export async function syncAuthSession(idToken: string | null): Promise<AuthSessionSyncResult> {
  if (!idToken) {
    await fetch('/api/auth/session', { method: 'DELETE' });
    return { isAdmin: false, refreshClaims: false };
  }

  return postSession(idToken);
}

export async function fetchServerAdminStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/admin-status', { credentials: 'include' });
    if (!response.ok) return false;
    const data = (await response.json()) as { isAdmin?: boolean };
    return Boolean(data.isAdmin);
  } catch {
    return false;
  }
}
