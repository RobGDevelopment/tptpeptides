import 'server-only';

import { getSupabasePoolerUrl, isSupabasePoolerEnabled } from './config.server';

/**
 * Validates pooler env for direct SQL clients (Sprint 1b).
 * Install `postgres` and call with `prepare: false` when enabling batch jobs.
 */
export function assertSupabasePoolerConfigured(): { poolerUrl: string } {
  if (!isSupabasePoolerEnabled()) {
    throw new Error('Set SUPABASE_DB_USE_POOLER=true to enable direct SQL via Supavisor.');
  }

  const poolerUrl = getSupabasePoolerUrl();
  if (!poolerUrl) {
    throw new Error(
      'SUPABASE_POOLER_URL is required (transaction mode, port 6543). See Supabase → Database → Connection pooling.'
    );
  }

  if (!poolerUrl.includes('6543') && !poolerUrl.includes('pooler')) {
    console.warn('[supabase/pool] SUPABASE_POOLER_URL may not target Supavisor transaction pooler.');
  }

  return { poolerUrl };
}
