/**
 * Clinic domain cutover — local env, Firebase tenant_config, Vercel env + DNS status.
 *
 * Usage:
 *   npm run setup:clinic-domain
 *   npm run setup:clinic-domain -- production
 *   npm run setup:clinic-domain -- production --skip-vercel --skip-firebase
 *
 * Requires .env.local with Firebase Admin keys for tenant_config updates.
 * Vercel env push uses `npx vercel env add` (CLI login) or VERCEL_TOKEN in .env.local.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  CLINIC_CANONICAL_SITE_URL,
  CLINIC_ROUTING_HOSTS,
  CLINIC_TENANT_ID,
  PRIMARY_CLINIC_HOSTS,
} from '../lib/tenant/constants';
import { patchEnvLocal } from './lib/patchEnvLocal';

config({ path: resolve(process.cwd(), '.env.local') });

const ENV_FILE = resolve(process.cwd(), '.env.local');
const VERCEL_DNS_APEX = '76.76.21.21';
const VERCEL_DNS_WWW_CNAME = 'cname.vercel-dns.com';

type VercelDomainPayload = {
  name: string;
  verified: boolean;
  verification?: Array<{ type: string; domain: string; value: string; reason?: string }>;
  error?: { message?: string };
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseArgs(): { environments: string[]; skipVercel: boolean; skipFirebase: boolean } {
  const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const environments = (positional[0]?.split(',') ?? ['production'])
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    environments,
    skipVercel: hasFlag('--skip-vercel'),
    skipFirebase: hasFlag('--skip-firebase'),
  };
}

function vercelToken(): string | null {
  return process.env.VERCEL_API_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim() || null;
}

function vercelProjectId(): string | null {
  return process.env.VERCEL_PROJECT_ID?.trim() || null;
}

function vercelTeamQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
}

async function fetchVercelDomain(domain: string): Promise<VercelDomainPayload | null> {
  const token = vercelToken();
  const projectId = vercelProjectId();
  if (!token || !projectId) return null;

  const response = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}${vercelTeamQuery()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Vercel domain lookup failed for ${domain} (${response.status})`);
  }

  return (await response.json()) as VercelDomainPayload;
}

function initFirebaseAdmin(): boolean {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return false;
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return true;
}

async function appendClinicDomainsToFirebase(): Promise<string[]> {
  const ref = getFirestore().collection('tenant_config').doc(CLINIC_TENANT_ID);
  const snap = await ref.get();
  const now = new Date().toISOString();

  const existingDomains = snap.exists
    ? ((snap.data()?.domains as string[] | undefined) ?? [])
    : [...PRIMARY_CLINIC_HOSTS];

  const merged = new Set(
    [...existingDomains, ...CLINIC_ROUTING_HOSTS].map((host) => host.trim().toLowerCase()).filter(Boolean)
  );

  await ref.set(
    {
      slug: CLINIC_TENANT_ID,
      lane: 'telehealth',
      domains: [...merged],
      updatedAt: now,
      ...(snap.exists ? {} : { active: true, createdAt: now }),
    },
    { merge: true }
  );

  return [...merged];
}

function runVercelEnvAdd(name: string, environment: string, value: string): boolean {
  const args = ['vercel', 'env', 'add', name, environment, '--force', '--yes'];
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
    cwd: process.cwd(),
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf-8',
    env: {
      ...process.env,
      VERCEL_PROJECT_ID: undefined,
      VERCEL_ORG_ID: undefined,
    },
  });

  if (result.status !== 0) {
    return false;
  }

  console.log(`✓ Vercel ${name} (${environment}) via CLI`);
  return true;
}

async function runVercelEnvAddViaApi(
  name: string,
  environment: string,
  value: string
): Promise<boolean> {
  const token = vercelToken();
  const projectId = vercelProjectId();
  if (!token || !projectId) return false;

  const response = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/env?upsert=true${vercelTeamQuery()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: name,
        value,
        type: 'plain',
        target: [environment],
      }),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const payload = (await response.json()) as { error?: { message?: string } };
    console.warn(
      `⚠ Could not set ${name} (${environment}) via Vercel API: ${payload.error?.message ?? response.status}`
    );
    return false;
  }

  console.log(`✓ Vercel ${name} (${environment}) via API`);
  return true;
}

async function pushVercelEnv(name: string, environment: string, value: string): Promise<boolean> {
  if (await runVercelEnvAddViaApi(name, environment, value)) {
    return true;
  }
  if (runVercelEnvAdd(name, environment, value)) {
    return true;
  }
  console.warn(`⚠ Could not set ${name} (${environment})`);
  return false;
}

function printDnsChecklist(): void {
  console.log('\n--- Registrar DNS (manual — required for Valid Configuration) ---');
  console.log('| Host | Type  | Value                  |');
  console.log('| `@`  | A     | 76.76.21.21            |');
  console.log('| www  | CNAME | cname.vercel-dns.com   |');
  console.log('\nConfirm exact values in Vercel → Domains → Edit → www.tptclinic.com');
  console.log(`Fallback reference: apex A → ${VERCEL_DNS_APEX}, www CNAME → ${VERCEL_DNS_WWW_CNAME}`);
}

function printSupabaseChecklist(): void {
  console.log('\n--- Supabase Auth (manual — dashboard only) ---');
  console.log('Project → Authentication → URL Configuration');
  console.log(`  Site URL: ${CLINIC_CANONICAL_SITE_URL}`);
  console.log(`  Redirect URLs (add both):`);
  console.log('    https://www.tptclinic.com/**');
  console.log('    https://tptclinic.com/**');
}

async function printVercelDomainStatus(): Promise<void> {
  const token = vercelToken();
  const projectId = vercelProjectId();

  console.log('\n--- Vercel domain status ---');
  if (!token || !projectId) {
    console.log('⚠ Set VERCEL_TOKEN + VERCEL_PROJECT_ID in .env.local to check domain verification.');
    printDnsChecklist();
    return;
  }

  for (const domain of ['tptclinic.com', 'www.tptclinic.com']) {
    try {
      const payload = await fetchVercelDomain(domain);
      if (!payload) {
        console.log(`✗ ${domain} — not attached to project ${projectId}`);
        continue;
      }

      const status = payload.verified ? 'Valid' : 'Invalid (DNS pending)';
      console.log(`${payload.verified ? '✓' : '⚠'} ${domain} — ${status}`);

      if (!payload.verified && payload.verification?.length) {
        for (const record of payload.verification) {
          console.log(`    ${record.type} ${record.domain} → ${record.value}`);
        }
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'lookup failed';
      console.warn(`⚠ ${domain} — ${message}`);
    }
  }

  if (!(await fetchVercelDomain('www.tptclinic.com'))?.verified) {
    printDnsChecklist();
  }
}

async function main(): Promise<void> {
  const { environments, skipVercel, skipFirebase } = parseArgs();

  console.log('MedFit clinic domain cutover\n');
  console.log(`Canonical clinic URL: ${CLINIC_CANONICAL_SITE_URL}`);

  const { changed } = patchEnvLocal(ENV_FILE, [
    {
      key: 'TENANT_CLINIC_HOSTS',
      value: CLINIC_ROUTING_HOSTS.join(','),
      mergeCsv: true,
      onlyIfMissing: false,
    },
    {
      key: 'NEXT_PUBLIC_CLINIC_SITE_URL',
      value: CLINIC_CANONICAL_SITE_URL,
      onlyIfMissing: false,
    },
  ]);

  if (changed.length > 0) {
    console.log(`\n✓ Updated .env.local: ${changed.join(', ')}`);
  } else {
    console.log('\n✓ .env.local already has clinic domain keys');
  }

  if (!skipFirebase) {
    console.log('\n--- Firebase tenant_config ---');
    if (!initFirebaseAdmin()) {
      console.warn('⚠ Firebase Admin SDK not configured — skipped tenant_config update.');
    } else {
      const domains = await appendClinicDomainsToFirebase();
      console.log(`✓ tenant_config/${CLINIC_TENANT_ID} domains (${domains.length}):`);
      console.log(`  ${domains.join(', ')}`);
    }
  }

  if (!skipVercel) {
    console.log('\n--- Vercel environment (Production) ---');
    const tenantHosts = CLINIC_ROUTING_HOSTS.join(',');
    let vercelOk = true;
    for (const environment of environments) {
      vercelOk =
        (await pushVercelEnv('TENANT_CLINIC_HOSTS', environment, tenantHosts)) && vercelOk;
      vercelOk =
        (await pushVercelEnv(
          'NEXT_PUBLIC_CLINIC_SITE_URL',
          environment,
          CLINIC_CANONICAL_SITE_URL
        )) && vercelOk;
    }

    if (!vercelOk) {
      console.warn('\nTip: run `npx vercel login` then re-run npm run setup:clinic-domain');
    } else if (environments.length > 0) {
      console.log('\nRedeploy production after DNS is valid: npx vercel --prod --yes');
    }
  }

  await printVercelDomainStatus();
  printSupabaseChecklist();

  console.log('\n--- Smoke tests (after DNS + redeploy) ---');
  console.log(`  ${CLINIC_CANONICAL_SITE_URL} → clinic landing`);
  console.log(`  ${CLINIC_CANONICAL_SITE_URL}/dashboard → patient portal`);
  console.log(`  ${CLINIC_CANONICAL_SITE_URL}/admin → redirects to B2B admin host`);
  console.log('  https://medfit-pro.vercel.app/admin → admin unchanged\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
