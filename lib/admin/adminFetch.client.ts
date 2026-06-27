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
