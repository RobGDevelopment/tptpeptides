'use client';

import { ensureAuthSessionCookie } from '../firebase/adminNav';

type AdminFetchInit = RequestInit & {
  /** Skip session cookie refresh (default false). */
  skipSessionSync?: boolean;
};

/** Authenticated admin API fetch — refreshes session cookie then sends credentials. */
export async function adminFetch(input: RequestInfo | URL, init: AdminFetchInit = {}) {
  const { skipSessionSync, ...fetchInit } = init;

  if (!skipSessionSync) {
    await ensureAuthSessionCookie();
  }

  return fetch(input, {
    credentials: 'include',
    ...fetchInit,
    headers: {
      ...(fetchInit.headers ?? {}),
    },
  });
}

export type AdminFetchJsonResult<T> = {
  response: Response;
  data: T;
  parseError: boolean;
};

/** Parse admin API JSON safely — avoids crashes when Vercel returns HTML error pages. */
export async function adminFetchJson<T extends { error?: string }>(
  input: RequestInfo | URL,
  init: AdminFetchInit = {}
): Promise<AdminFetchJsonResult<T>> {
  const response = await adminFetch(input, init);
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    const fallback: T = {
      error:
        response.status === 503
          ? 'Admin API unavailable on this deployment. Firebase Admin env vars may be missing — use production or sync Preview env vars.'
          : `Unexpected server response (${response.status}). Try refreshing or use https://medfit-pro.vercel.app/admin.`,
    } as T;

    return { response, data: fallback, parseError: true };
  }

  try {
    const data = (await response.json()) as T;
    return { response, data, parseError: false };
  } catch {
    const fallback: T = {
      error: `Invalid JSON from server (${response.status}).`,
    } as T;
    return { response, data: fallback, parseError: true };
  }
}
