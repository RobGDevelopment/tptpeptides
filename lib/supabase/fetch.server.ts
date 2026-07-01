import 'server-only';

import { isRetryableSupabaseResponse } from './retry.server';

type FetchRetryInit = RequestInit & {
  retryAttempts?: number;
  retryBaseDelayMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Drop-in fetch for @supabase/supabase-js `global.fetch`.
 * Retries 429/5xx from PostgREST with exponential backoff.
 */
export function createSupabaseFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: FetchRetryInit) => {
    const maxAttempts = init?.retryAttempts ?? 4;
    const baseDelayMs = init?.retryBaseDelayMs ?? 200;
    const { retryAttempts: _a, retryBaseDelayMs: _b, ...fetchInit } = init ?? {};

    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(input, fetchInit);
      lastResponse = response;

      if (!isRetryableSupabaseResponse(response) || attempt >= maxAttempts - 1) {
        return response;
      }

      const delay = Math.min(4000, baseDelayMs * 2 ** attempt);
      await sleep(delay + Math.floor(Math.random() * delay));
    }

    return lastResponse ?? fetch(input, fetchInit);
  };
}

export const supabaseFetchWithRetry = createSupabaseFetch();
