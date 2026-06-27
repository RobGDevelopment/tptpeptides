export const AUTH_SESSION_COOKIE = 'tpt-auth';

export async function syncAuthSession(idToken: string | null): Promise<void> {
  if (idToken) {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    return;
  }

  await fetch('/api/auth/session', { method: 'DELETE' });
}
