import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const keyPath = resolve(process.cwd(), 'firebase-admin-key.json');

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function runVercelEnvAdd(name: string, environment: string, value: string) {
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vercel', 'env', 'add', name, environment, '--force', '--yes', '--sensitive'],
    {
      cwd: process.cwd(),
      input: value,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      encoding: 'utf-8',
    },
  );

  if (result.status !== 0) {
    console.error(`Failed to set ${name} (${environment})`);
    if (result.stderr) console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  console.log(`✓ ${name} (${environment})`);
}

const creds = JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;

const privateKeyForVercel = creds.private_key.includes('\\n')
  ? creds.private_key
  : creds.private_key.replace(/\n/g, '\\n');

const vars: Array<[string, string]> = [
  ['FIREBASE_PROJECT_ID', creds.project_id],
  ['FIREBASE_CLIENT_EMAIL', creds.client_email],
  ['FIREBASE_PRIVATE_KEY', privateKeyForVercel],
];

const environments = (process.argv[2]?.split(',') ?? ['production', 'preview']).map((e) => e.trim());

for (const environment of environments) {
  console.log(`\nUpdating ${environment}…`);
  for (const [name, value] of vars) {
    runVercelEnvAdd(name, environment, value);
  }
}

console.log('\nDone. Redeploy production for changes to take effect.');
