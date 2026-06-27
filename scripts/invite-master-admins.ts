/**
 * Send Back-Office access emails to all MASTER_ADMIN_EMAILS.
 *
 * Usage:
 *   npx tsx scripts/invite-master-admins.ts --site=https://medfit-pro.vercel.app
 */
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

dotenv.config({ path: '.env.local' });

const MASTER_ADMIN_EMAILS = ['rjg.cal@gmail.com'];

const RESEND_API_URL = 'https://api.resend.com/emails';
const SITE_NAME = 'TPT Peptides';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function initFirebase() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: requireEnv('FIREBASE_PROJECT_ID'),
        clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
        privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    });
  }
  return { auth: getAuth(), db: getFirestore() };
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || 'TPTPeptides <orders@tptpeptides.com>';

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!response.ok) {
    console.error('[resend]', response.status, await response.text());
    return false;
  }

  return true;
}

function buildEmail(params: {
  email: string;
  backOfficeUrl: string;
  signInUrl: string;
  resetLink: string;
}) {
  const subject = `${SITE_NAME} — Back-Office access (Super Admin)`;
  const html = `
<p>You have been provisioned as a Super Admin for ${SITE_NAME}.</p>
<p><strong>1. Set your password:</strong><br><a href="${params.resetLink}">${params.resetLink}</a></p>
<p><strong>2. Sign in:</strong><br><a href="${params.signInUrl}">${params.signInUrl}</a></p>
<p><strong>3. Open Back-Office:</strong><br><a href="${params.backOfficeUrl}">${params.backOfficeUrl}</a></p>
<p>Enable feature modules at /admin/modules after your first login.</p>`;
  const text = [
    `${SITE_NAME} — Super Admin Back-Office`,
    `Set password: ${params.resetLink}`,
    `Sign in: ${params.signInUrl}`,
    `Back-Office: ${params.backOfficeUrl}`,
  ].join('\n');
  return { subject, html, text };
}

async function main() {
  const siteUrl =
    process.argv.find((a) => a.startsWith('--site='))?.slice(7) ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://medfit-pro.vercel.app';

  const base = siteUrl.replace(/\/$/, '');
  const backOfficeUrl = `${base}/admin`;
  const signInUrl = `${base}/account`;

  const { auth, db } = initFirebase();

  for (const rawEmail of MASTER_ADMIN_EMAILS) {
    const email = rawEmail.trim().toLowerCase();
    console.log(`\n→ ${email}`);

    let uid: string;
    let created = false;

    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const user = await auth.createUser({
        email,
        password: randomBytes(24).toString('base64url'),
      });
      uid = user.uid;
      created = true;
    }

    await auth.setCustomUserClaims(uid, { admin: true, role: 'admin' });
    await db.collection('users').doc(uid).set(
      {
        uid,
        email,
        role: 'admin',
        accessLevel: 100,
        disabled: false,
        invitedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const resetLink = await auth.generatePasswordResetLink(email);

    const { subject, html, text } = buildEmail({ email, backOfficeUrl, signInUrl, resetLink });
    const sent = await sendResendEmail({ to: email, subject, html, text });

    console.log(`  uid: ${uid}${created ? ' (new)' : ''}`);
    console.log(`  email sent: ${sent ? 'yes' : 'no — Resend not configured'}`);
    if (!sent) console.log(`  reset link: ${resetLink}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
