/**
 * Verify Supabase env vars and basic connectivity (reads .env.local only).
 *
 * Usage: npm run verify:supabase-env
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

type Check = { name: string; ok: boolean; detail: string };

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function jwtShape(key: string | null): boolean {
  return Boolean(key && key.startsWith('eyJ') && key.length > 100);
}

async function main() {
  const checks: Check[] = [];
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const service = readEnv('SUPABASE_SERVICE_ROLE_KEY');

  checks.push({
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    ok: Boolean(url?.startsWith('https://') && url.includes('.supabase')),
    detail: url ? `set (${url.length} chars)` : 'missing',
  });
  checks.push({
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ok: jwtShape(anon),
    detail: anon ? `set (${anon.length} chars)` : 'missing',
  });
  checks.push({
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    ok: Boolean(service),
    detail: service ? `set (${service.length} chars)` : 'missing',
  });

  if (!url || !anon || !service) {
    printChecks(checks);
    process.exit(1);
  }

  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const { error: anonError } = await anonClient.from('patient_profiles').select('id').limit(1);
  checks.push({
    name: 'anon client query (patient_profiles)',
    ok: !anonError,
    detail: anonError?.message ?? 'ok',
  });

  const adminClient = createClient(url, service, { auth: { persistSession: false } });
  const { error: adminError } = await adminClient.from('medical_intakes').select('id').limit(1);
  checks.push({
    name: 'service_role query (medical_intakes)',
    ok: !adminError,
    detail: adminError?.message ?? 'ok',
  });

  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  checks.push({
    name: 'service_role auth admin API',
    ok: !authError && Array.isArray(authData?.users),
    detail: authError?.message ?? `ok (${authData?.users?.length ?? 0} users sampled)`,
  });

  printChecks(checks);

  const failed = checks.some((check) => !check.ok);
  if (failed) {
    console.error('\nFix failing checks in .env.local before syncing to Vercel.');
    process.exit(1);
  }

  if (service && !jwtShape(service)) {
    console.log('\nNote: service role key uses a non-JWT format but connectivity succeeded.');
  }

  console.log('\n✓ Supabase env is valid and reachable.');
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
