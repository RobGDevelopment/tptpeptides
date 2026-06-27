/**
 * Adds an authorized domain to Firebase Auth (Identity Platform config).
 * Usage: npx tsx scripts/add-firebase-auth-domain.ts medfit-pro.vercel.app
 */
import dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';

dotenv.config({ path: '.env.local' });

const domain = process.argv[2]?.trim().toLowerCase();
if (!domain) {
  console.error('Usage: npx tsx scripts/add-firebase-auth-domain.ts <domain>');
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

async function main() {
  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

  const current = await client.request<{ authorizedDomains?: string[] }>({ url: base });
  const existing = current.data.authorizedDomains ?? [];
  const normalized = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  if (existing.includes(normalized)) {
    console.log(`Already authorized: ${normalized}`);
    console.log('Current domains:', existing.join(', '));
    return;
  }

  const authorizedDomains = [...existing, normalized];
  await client.request({
    url: base,
    method: 'PATCH',
    params: { updateMask: 'authorizedDomains' },
    data: { authorizedDomains },
  });

  console.log(`Added authorized domain: ${normalized}`);
  console.log('Authorized domains:', authorizedDomains.join(', '));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
