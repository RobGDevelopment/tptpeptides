import 'server-only';

import { MASTER_ADMIN_EMAILS } from './masterAdmin';
import { sendPersonaInvite } from '../email/inviteEngine.server';
import { logAdminAction } from '../firebase/adminAuth.server';
import { isAdminSdkConfigured } from '../firebase/admin';
import type { InviteStatus } from '../schemas/invitation';

export interface MasterAdminInviteResult {
  email: string;
  uid: string;
  created: boolean;
  emailSent: boolean;
  inviteStatus: InviteStatus;
  inviteId?: string;
  resetLink?: string;
  error?: string;
}

/** Provisions all master admins and sends branded super-admin invite emails. */
export async function inviteAllMasterAdmins(params: {
  siteUrl?: string;
  triggeredByUid?: string;
}): Promise<MasterAdminInviteResult[]> {
  if (!isAdminSdkConfigured()) {
    throw new Error('Firebase Admin SDK is not configured');
  }

  const results: MasterAdminInviteResult[] = [];

  for (const rawEmail of MASTER_ADMIN_EMAILS) {
    const email = rawEmail.trim().toLowerCase();

    try {
      const invite = await sendPersonaInvite({
        email,
        persona: 'super_admin',
        invitedBy: params.triggeredByUid ?? 'system',
        siteUrl: params.siteUrl,
      });

      results.push({
        email: invite.email,
        uid: invite.uid,
        created: invite.accountCreated,
        emailSent: invite.emailSent,
        inviteStatus: invite.inviteStatus,
        inviteId: invite.inviteId,
        resetLink: invite.passwordResetUrl,
        error: invite.error,
      });
    } catch (error) {
      results.push({
        email,
        uid: '',
        created: false,
        emailSent: false,
        inviteStatus: 'failed',
        error: error instanceof Error ? error.message : 'Invite failed',
      });
    }
  }

  if (params.triggeredByUid) {
    await logAdminAction({
      userId: params.triggeredByUid,
      action: 'master_admin_invite',
      metadata: {
        recipients: results.map((r) => ({
          email: r.email,
          inviteStatus: r.inviteStatus,
          error: r.error,
        })),
      },
    });
  }

  return results;
}
