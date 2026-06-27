/** Shared auth cookie name — safe to import from routes without pulling in next/headers. */
export const AUTH_SESSION_COOKIE = 'tpt-auth';

/** Firebase session cookie lifetime (5 days). */
export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 5;
