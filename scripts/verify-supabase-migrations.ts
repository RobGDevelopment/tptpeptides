/**
 * Verify expected clinic-lane tables exist after applying supabase/migrations.
 *
 * Usage: npm run verify:supabase-migrations
 */
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

type Check = { name: string; ok: boolean; detail: string };

/** Tables introduced or required by migrations 0001–0009. */
const EXPECTED_TABLES = [
  'patient_profiles',
  'medical_intakes',
  'prescriptions',
  'prescription_dispatches',
  'clinic_revenue_events',
  'platform_integrations',
  'clinic_messages',
  'clinic_lab_results',
] as const;

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function listMigrationFiles(): string[] {
  const dir = resolve(process.cwd(), 'supabase/migrations');
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function tableExists(
  client: SupabaseClient,
  table: (typeof EXPECTED_TABLES)[number]
): Promise<{ ok: boolean; detail: string }> {
  const { error } = await client.from(table).select('*').limit(0);
  if (!error) return { ok: true, detail: 'reachable' };

  const message = error.message.toLowerCase();
  if (message.includes('does not exist') || message.includes('schema cache')) {
    return { ok: false, detail: 'missing — apply migrations in Supabase Dashboard' };
  }

  return { ok: false, detail: error.message };
}

async function main() {
  const checks: Check[] = [];
  const migrations = listMigrationFiles();

  checks.push({
    name: 'migration files on disk',
    ok: migrations.length >= 9,
    detail: `${migrations.length} files (${migrations[migrations.length - 1] ?? 'none'})`,
  });

  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const service = readEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !service) {
    checks.push({
      name: 'Supabase credentials',
      ok: false,
      detail: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
    });
    printChecks(checks);
    process.exit(1);
  }

  const client = createClient(url, service, { auth: { persistSession: false } });

  for (const table of EXPECTED_TABLES) {
    const result = await tableExists(client, table);
    checks.push({ name: `table:${table}`, ok: result.ok, detail: result.detail });
  }

  const poolerUrl = readEnv('SUPABASE_POOLER_URL');
  const poolerEnabled = readEnv('SUPABASE_DB_USE_POOLER')?.toLowerCase() === 'true';
  checks.push({
    name: 'SUPABASE_POOLER_URL (Sprint 1)',
    ok: !poolerEnabled || Boolean(poolerUrl),
    detail: poolerEnabled
      ? poolerUrl
        ? 'set'
        : 'required when SUPABASE_DB_USE_POOLER=true'
      : 'optional (PostgREST uses API URL)',
  });

  printChecks(checks);

  const failed = checks.some((check) => !check.ok);
  if (failed) {
    console.error('\nApply pending migrations: Supabase Dashboard → SQL Editor, or `supabase link` + `supabase db push`.');
    process.exit(1);
  }

  console.log('\n✓ Clinic schema migrations appear applied.');
}

function printChecks(checks: Check[]) {
  for (const check of checks) {
    console.log(`${check.ok ? '✓' : '✗'} ${check.name}: ${check.detail}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
