/**
 * One-shot local clinic dev bootstrap:
 * - patches .env.local (dry-run OpenLoop, CRON_SECRET, clinic hosts)
 * - enables telehealth + transactional email module flags in Firebase
 * - seeds demo Supabase patients (submitted intake + approved Rx + SLA stale row)
 *
 * Usage: npm run setup:clinic-dev
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { generateCronSecret, patchEnvLocal } from './lib/patchEnvLocal';

config({ path: resolve(process.cwd(), '.env.local') });

function runStep(label: string, command: string, args: string[]): void {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const envPath = resolve(process.cwd(), '.env.local');
  const { changed } = patchEnvLocal(envPath, [
    { key: 'OPENLOOP_DISPATCH_DRY_RUN', value: 'true', onlyIfMissing: false },
    {
      key: 'TENANT_CLINIC_HOSTS',
      value: 'localhost,127.0.0.1',
      mergeCsv: true,
      onlyIfMissing: false,
    },
    { key: 'CRON_SECRET', generate: generateCronSecret, onlyIfMissing: true },
    {
      key: 'PLAYWRIGHT_BASE_URL',
      value: 'http://localhost:3001',
      onlyIfMissing: true,
    },
  ]);

  if (changed.length > 0) {
    console.log(`✓ Updated .env.local: ${changed.join(', ')}`);
  } else {
    console.log('✓ .env.local already has required clinic dev keys');
  }

  runStep('Enable production module flags', 'npm', ['run', 'enable:prod-modules']);
  runStep('Seed clinic demo data', 'npm', ['run', 'seed:clinic-demo', '--', '--full', '--sla']);

  console.log('\n✓ Clinic dev setup complete\n');
  console.log('Patient portal login:');
  console.log('  patient.demo@test.com / ClinicDemo2026!');
  console.log('\nAdmin wellness (Firebase login):');
  console.log('  /admin/wellness/intakes');
  console.log('  /admin/wellness/prescriptions — Dispatch uses OpenLoop dry-run');
  console.log('\nStart the app:');
  console.log('  npm run dev');
  console.log('\nOptional SLA cron test (dev server must be running):');
  console.log('  npm run test:clinic-sla');
}

main();
