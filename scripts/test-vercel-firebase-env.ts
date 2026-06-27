import { config } from 'dotenv';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

config({ path: resolve('.env.vercel.production') });

function normalizePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('\\n')) {
    return trimmed.replace(/\\n/g, '\n');
  }
  return trimmed;
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

console.log('configured:', Boolean(projectId && clientEmail && privateKeyRaw));
console.log('projectId:', projectId);
console.log('clientEmail:', clientEmail);
console.log('privateKey length:', privateKeyRaw?.length ?? 0);
console.log('privateKey has literal backslash-n:', privateKeyRaw?.includes('\\n') ?? false);
console.log('privateKey has real newlines:', privateKeyRaw?.includes('\n') ?? false);
console.log('privateKey starts with BEGIN:', privateKeyRaw?.trim().startsWith('-----BEGIN'));

void (async () => {
  if (!projectId || !clientEmail || !privateKeyRaw) {
    process.exit(1);
  }

  try {
    const privateKey = normalizePrivateKey(privateKeyRaw);
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
    await getAuth().listUsers(1);
    console.log('Firebase Admin init: OK');
  } catch (error) {
    console.error('Firebase Admin init: FAILED');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();
