/**
 * Push Supabase + clinic cron env vars from .env.local to Vercel.
 *
 * Usage:
 *   npm run verify:supabase-env
 *   npm run sync:supabase-env
 *   npm run sync:supabase-env -- production,development
 *
 * Requires: Vercel CLI logged in, valid .env.local values.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ENV_FILE = resolve(process.cwd(), '.env.local');

const SYNC_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'OPENLOOP_DISPATCH_DRY_RUN',
  'WELLNESS_SLA_ALERT_EMAIL',
] as const;

function parseEnvFile(path: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(path)) return map;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

function runVercelEnvAdd(name: string, environment: string, value: string) {
  const sensitive =
    !name.startsWith('NEXT_PUBLIC_') &&
    (name.includes('SECRET') || name.includes('SERVICE_ROLE') || name.includes('_KEY'));

  const args = ['vercel', 'env', 'add', name, environment, '--force', '--yes'];
  if (sensitive) args.push('--sensitive');

  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
    cwd: process.cwd(),
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    console.error(`Failed to set ${name} (${environment})`);
    if (result.stderr) console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  console.log(`✓ ${name} (${environment})`);
}

function main() {
  const envMap = parseEnvFile(ENV_FILE);
  if (envMap.size === 0) {
    console.error(`No variables found in ${ENV_FILE}`);
    process.exit(1);
  }

  const environments = (process.argv[2]?.split(',') ?? ['production', 'development']).map((e) =>
    e.trim()
  );

  const missingRequired = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
    (key) => !envMap.get(key)?.trim()
  );

  if (missingRequired.length > 0) {
    console.error(`Missing required keys in .env.local: ${missingRequired.join(', ')}`);
    process.exit(1);
  }

  for (const environment of environments) {
    console.log(`\nUpdating ${environment}…`);
    for (const key of SYNC_KEYS) {
      const value = envMap.get(key)?.trim();
      if (!value) continue;
      runVercelEnvAdd(key, environment, value);
    }
  }

  console.log('\nDone. Redeploy production: npx vercel --prod --yes');
}

main();
