import 'server-only';

import { randomBytes } from 'crypto';
import { MASTER_ADMIN_EMAILS } from './masterAdmin';
import { syncMasterAdminAccess } from './syncMasterAdmin.server';
import { buildMasterAdminAccessEmail, masterAdminUrls } from '../email/masterAdminAccess.server';
import { isResendConfigured, sendEmail } from '../email/resend.server';
import { getAdminAuth, getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import { logAdminAction } from '../firebase/adminAuth.server';

export interface MasterAdminInviteResult {
  email: string;
  uid: string;
  created: boolean;
  emailSent: boolean;
  resetLink?: string;
  error?: string;
}

async function ensureAuthUser(email: string): Promise<{ uid: string; created: boolean }> {
  const auth = getAdminAuth();
  const normalized = email.trim().toLowerCase();

  try {
    const existing = await auth.getUserByEmail(normalized);
    return { uid: existing.uid, created: false };
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String((error as { code: string }).code) : '';
    if (code !== 'auth/user-not-found') throw error;
  }

  const tempPassword = randomBytes(24).toString('base64url');
  const created = await auth.createUser({
    email: normalized,
    password: tempPassword,
    emailVerified: false,
  });

  return { uid: created.uid, created: true };
}

/** Provisions all master admins and sends Back-Office access email via Resend. */
export async function inviteAllMasterAdmins(params: {
  siteUrl?: string;
  triggeredByUid?: string;
}): Promise<MasterAdminInviteResult[]> {
  if (!isAdminSdkConfigured()) {
    throw new Error('Firebase Admin SDK is not configured');
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const { backOfficeUrl, signInUrl } = masterAdminUrls(params.siteUrl);
  const results: MasterAdminInviteResult[] = [];

  for (const rawEmail of MASTER_ADMIN_EMAILS) {
    const email = rawEmail.trim().toLowerCase();

    try {
      const { uid, created } = await ensureAuthUser(email);
      await syncMasterAdminAccess(uid, email);

      await db.collection('users').doc(uid).set(
        {
          email,
          invitedAt: new Date().toISOString(),
          invitedBy: params.triggeredByUid ?? 'system',
        },
        { merge: true }
      );

      const resetLink = await auth.generatePasswordResetLink(email);

      const { subject, html, text } = buildMasterAdminAccessEmail({
        email,
        backOfficeUrl,
        signInUrl,
        passwordResetUrl: resetLink,
      });

      let emailSent = false;
      if (isResendConfigured()) {
        await sendEmail({ to: email, subject, html, text });
        emailSent = true;
      }

      results.push({ email, uid, created, emailSent, resetLink: emailSent ? undefined : resetLink });
    } catch (error) {
      results.push({
        email,
        uid: '',
        created: false,
        emailSent: false,
        error: error instanceof Error ? error.message : 'Invite failed',
      });
    }
  }

  if (params.triggeredByUid) {
    await logAdminAction({
      userId: params.triggeredByUid,
      action: 'master_admin_invite',
      metadata: {
        recipients: results.map((r) => ({ email: r.email, emailSent: r.emailSent, error: r.error })),
      },
    });
  }

  return results;
}
