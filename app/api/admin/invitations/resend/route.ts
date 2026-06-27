import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isMasterAdminEmail } from '../../../../../lib/admin/masterAdmin';
import {
  AdminAuthError,
  logAdminAction,
  requireAdminSessionWithProfile,
} from '../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import {
  resendPersonaInvite,
  sendPersonaInvite,
} from '../../../../../lib/email/inviteEngine.server';
import { ModuleDisabledError, requireModule } from '../../../../../lib/modules/requireModule.server';
import { adminUserInviteSchema } from '../../../../../lib/schemas/invitation';

export const dynamic = 'force-dynamic';

const resendByIdSchema = z.object({
  inviteId: z.string().min(1),
  siteUrl: z.string().url().optional(),
});

const resendCustomSchema = adminUserInviteSchema
  .extend({
    targetUid: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.persona === 'staff_partner' && !data.role) {
      ctx.addIssue({
        code: 'custom',
        message: 'Role is required for staff/partner invites',
        path: ['role'],
      });
    }
  });

const bodySchema = z.union([resendByIdSchema, resendCustomSchema]);

export async function POST(request: Request) {
  try {
    const { session: admin } = await requireAdminSessionWithProfile(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isUserManagementEnabled');

    const payload = bodySchema.parse(await request.json());

    if ('inviteId' in payload) {
      const result = await resendPersonaInvite({
        inviteId: payload.inviteId,
        invitedBy: admin.uid,
        siteUrl: payload.siteUrl,
      });

      await logAdminAction({
        userId: admin.uid,
        action: 'invite_resend',
        metadata: {
          inviteId: payload.inviteId,
          email: result.email,
          inviteStatus: result.inviteStatus,
        },
      });

      return NextResponse.json({ ok: true, ...result });
    }

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const userDoc = await getAdminFirestore().collection('users').doc(payload.targetUid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userEmail = String(userDoc.data()?.email ?? '').trim().toLowerCase();
    const normalizedEmail = payload.email.trim().toLowerCase();

    if (userEmail && userEmail !== normalizedEmail) {
      return NextResponse.json({ error: 'Email does not match user record' }, { status: 400 });
    }

    if (payload.persona === 'super_admin' && !isMasterAdminEmail(admin.email)) {
      return NextResponse.json(
        { error: 'Only master admins can send super-admin invites' },
        { status: 403 }
      );
    }

    const invite = await sendPersonaInvite({
      email: normalizedEmail,
      persona: payload.persona,
      role: payload.role,
      institutionTier: payload.institutionTier,
      institutionName: payload.institutionName,
      personalNote: payload.personalNote,
      siteUrl: payload.siteUrl,
      invitedBy: admin.uid,
    });

    await logAdminAction({
      userId: admin.uid,
      action: 'invite_resend',
      metadata: {
        targetUid: payload.targetUid,
        email: invite.email,
        persona: payload.persona,
        inviteStatus: invite.inviteStatus,
        customized: true,
      },
    });

    return NextResponse.json({ ok: true, ...invite, targetUid: payload.targetUid });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'User management module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Unable to resend invite';
    console.error('[admin/invitations/resend] failed', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
