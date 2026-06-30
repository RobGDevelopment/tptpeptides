/**
 * Enable production-ready module flags and seed default tier price lists.
 *
 * Usage:
 *   npm run enable:prod-modules
 *
 * Requires Firebase Admin env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * or a local firebase-admin-key.json in the project root.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildDefaultPriceLists } from '../lib/data/priceListDefaults';
import { DEFAULT_MODULE_FLAGS } from '../lib/data/moduleDefaults';
import { moduleFlagsSchema } from '../lib/schemas/modules';

config({ path: resolve(process.cwd(), '.env.local') });

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function loadServiceAccount(): ServiceAccount {
  const keyPath = resolve(process.cwd(), 'firebase-admin-key.json');
  if (existsSync(keyPath)) {
    return JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      'Missing Firebase Admin credentials. Set FIREBASE_* in .env.local or add firebase-admin-key.json.'
    );
    process.exit(1);
  }

  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

function initAdmin() {
  if (getApps().length === 0) {
    const creds = loadServiceAccount();
    initializeApp({
      credential: cert({
        projectId: creds.project_id,
        clientEmail: creds.client_email,
        privateKey: creds.private_key,
      }),
    });
  }
  return getFirestore();
}

const PRODUCTION_MODULE_FLAGS = {
  ...DEFAULT_MODULE_FLAGS,
  isB2BProcurementEnabled: true,
  isInstitutionVerificationEnabled: true,
  isTieredPricingEnabled: true,
  isUserManagementEnabled: true,
  isAccountingExportEnabled: true,
  isTransactionalEmailEnabled: true,
  isTelehealthEnabled: true,
};

async function main() {
  const db = initAdmin();
  const now = new Date().toISOString();

  const flags = moduleFlagsSchema.parse({
    ...PRODUCTION_MODULE_FLAGS,
    updatedAt: now,
    updatedBy: 'scripts/enable-prod-modules.ts',
  });

  await db.doc('settings/modules').set(flags, { merge: true });
  console.log('✓ Module flags written to settings/modules');

  const defaults = buildDefaultPriceLists();
  for (const list of Object.values(defaults)) {
    await db
      .doc(`priceLists/${list.tier.toLowerCase()}`)
      .set({ ...list, updatedAt: now, updatedBy: 'scripts/enable-prod-modules.ts' }, { merge: true });
    console.log(`✓ Price list seeded: ${list.tier} (${Math.round(list.discountPercent * 100)}% off)`);
  }

  console.log('\nEnabled modules:');
  Object.entries(flags)
    .filter(([key, value]) => key.startsWith('is') && value === true)
    .forEach(([key]) => console.log(`  • ${key}`));

  console.log('\nManual steps still required:');
  console.log('  • Verify RESEND_API_KEY + RESEND_FROM_EMAIL on Vercel production');
  console.log('  • Deploy firestore.rules: firebase deploy --only firestore:rules');
  console.log('  • Confirm GitHub → Vercel auto-deploy is connected');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
