import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonKey, getSupabaseApiUrl } from './config';

export function createClient() {
  return createBrowserClient(getSupabaseApiUrl(), getSupabaseAnonKey());
}
