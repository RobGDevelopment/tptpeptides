import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseApiUrl } from './config';
import { supabaseFetchWithRetry } from './fetch.server';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseApiUrl(), getSupabaseAnonKey(), {
    global: {
      fetch: supabaseFetchWithRetry,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll from a Server Component — safe to ignore when proxy already refreshed cookies
        }
      },
    },
  });
}
