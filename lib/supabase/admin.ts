import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseApiUrl } from './config';
import { getSupabaseServiceRoleKey } from './config.server';
import { supabaseFetchWithRetry } from './fetch.server';

export function createAdminClient() {
  return createClient(getSupabaseApiUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: supabaseFetchWithRetry,
    },
  });
}
