/** Supabase API URL (PostgREST) — safe for browser and server clients. */
export function getSupabaseApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for telehealth lane.');
  }
  return url.replace(/\/$/, '');
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for telehealth lane.');
  }
  return key;
}
