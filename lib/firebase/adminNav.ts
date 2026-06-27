'use client';

import { auth } from './auth';
import { syncAuthSession } from './session';

/** Refresh the httpOnly session cookie from the current Firebase user. */
export async function ensureAuthSessionCookie(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  let idToken = await user.getIdToken(true);
  let result = await syncAuthSession(idToken);

  if (result.refreshClaims) {
    idToken = await user.getIdToken(true);
    await syncAuthSession(idToken);
  }
}

/** Sync session cookie then hard-navigate to back-office (avoids client redirect loops). */
export async function navigateToAdmin(): Promise<void> {
  try {
    await ensureAuthSessionCookie();
  } catch {
    // Client-side admin guard can still allow access when Firebase role/claims are valid.
  }
  window.location.assign('/admin');
}
