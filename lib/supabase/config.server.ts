import 'server-only';

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for telehealth admin operations.');
  }
  return key;
}

/**
 * Transaction-mode pooler URL (port 6543) for direct SQL clients only.
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
 */
export function getSupabasePoolerUrl(): string | null {
  const explicit = process.env.SUPABASE_POOLER_URL?.trim();
  if (explicit) return explicit;

  const databaseUrl = process.env.SUPABASE_DATABASE_URL?.trim();
  if (databaseUrl && databaseUrl.includes('pooler')) {
    return databaseUrl;
  }

  return null;
}

export function isSupabasePoolerEnabled(): boolean {
  return process.env.SUPABASE_DB_USE_POOLER?.trim().toLowerCase() === 'true';
}
