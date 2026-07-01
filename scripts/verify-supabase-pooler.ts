/**
 * Verify Supavisor transaction pooler (port 6543) with a raw SQL connection.
 *
 * Usage: npm run verify:supabase-pooler
 */
import { config } from 'dotenv';
import postgres from 'postgres';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

async function main() {
  const poolerUrl = readEnv('SUPABASE_POOLER_URL');
  const poolerEnabled = readEnv('SUPABASE_DB_USE_POOLER')?.toLowerCase() === 'true';

  if (!poolerEnabled) {
    console.error('✗ SUPABASE_DB_USE_POOLER is not set to "true".');
    process.exit(1);
  }

  if (!poolerUrl) {
    console.error('✗ SUPABASE_POOLER_URL is missing from .env.local');
    process.exit(1);
  }

  if (!poolerUrl.includes('6543')) {
    console.warn('⚠ SUPABASE_POOLER_URL does not contain port 6543 — confirm transaction mode pooler URL.');
  }

  const sql = postgres(poolerUrl, {
    prepare: false,
    max: 1,
    connect_timeout: 15,
    idle_timeout: 5,
  });

  try {
    const rows = await sql<{ ok: number }[]>`SELECT 1 AS ok`;
    const value = rows[0]?.ok;

    if (value !== 1) {
      console.error('✗ Pooler query returned unexpected result:', rows);
      process.exit(1);
    }

    console.log('✓ Supabase transaction pooler connection succeeded (SELECT 1).');
    console.log('  prepare: false (transaction mode)');
    console.log(`  port: ${poolerUrl.includes('6543') ? '6543' : 'check URL'}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('✗ Pooler connection failed:', message);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
