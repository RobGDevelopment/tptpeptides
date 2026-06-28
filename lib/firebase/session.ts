export const AUTH_SESSION_COOKIE = 'tpt-auth';

export interface AuthSessionSyncResult {
  isAdmin: boolean;
  refreshClaims: boolean;
}

async function postSession(idToken: string): Promise<AuthSessionSyncResult> {
  const response = await fetch('/api/session/sync', {
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
    await fetch('/api/session/sync', { method: 'DELETE' });
    return { isAdmin: false, refreshClaims: false };
  }

  return postSession(idToken);
}

export interface ServerAuthStatus {
  isAdmin: boolean;
  isMasterAdmin: boolean;
  isPartner: boolean;
  canAccessExecutiveManual: boolean;
}

export async function fetchServerAdminStatus(): Promise<ServerAuthStatus> {
  try {
    const response = await fetch('/api/session/admin-status', { credentials: 'include' });
    if (!response.ok) {
      return { isAdmin: false, isMasterAdmin: false, isPartner: false, canAccessExecutiveManual: false };
    }
    const data = (await response.json()) as {
      isAdmin?: boolean;
      isMasterAdmin?: boolean;
      isPartner?: boolean;
      canAccessExecutiveManual?: boolean;
    };
    return {
      isAdmin: Boolean(data.isAdmin),
      isMasterAdmin: Boolean(data.isMasterAdmin),
      isPartner: Boolean(data.isPartner),
      canAccessExecutiveManual: Boolean(data.canAccessExecutiveManual),
    };
  } catch {
    return { isAdmin: false, isMasterAdmin: false, isPartner: false, canAccessExecutiveManual: false };
  }
}
