import 'server-only';

export type SupabaseRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
};

const DEFAULT_OPTIONS: Required<Omit<SupabaseRetryOptions, 'label'>> = {
  maxAttempts: 4,
  baseDelayMs: 200,
  maxDelayMs: 4000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.floor(Math.random() * exponential);
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('too many requests') ||
    message.includes('rate limit')
  );
}

export function isRetryableSupabaseResponse(response: Response): boolean {
  return isRetryableStatus(response.status);
}

/**
 * Wraps a Supabase server action with exponential backoff for transient failures.
 */
export async function withSupabaseRetry<T>(
  operation: () => Promise<T>,
  options: SupabaseRetryOptions = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (caught) {
      lastError = caught;
      const isLast = attempt >= maxAttempts - 1;
      if (isLast || !isRetryableError(caught)) {
        throw caught;
      }
      await sleep(jitteredDelay(attempt, baseDelayMs, maxDelayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Supabase retry exhausted.');
}
