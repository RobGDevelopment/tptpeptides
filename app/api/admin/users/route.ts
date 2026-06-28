import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isMasterAdminEmail } from '../../../../lib/admin/masterAdmin';
import { getAdminFirestore, getAdminAuth, isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import {
  AdminAuthError,
  logAdminAction,
  requireAdminSession,
  requireAdminSessionWithProfile,
} from '../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { listUsersForAdmin } from '../../../../lib/firebase/users.server';
import { sendPersonaInvite } from '../../../../lib/email/inviteEngine.server';
import { getResendEmailConfig } from '../../../../lib/email/resend.server';
import { ModuleDisabledError, requireModule } from '../../../../lib/modules/requireModule.server';
import { adminUserInviteSchema } from '../../../../lib/schemas/invitation';
import {
  accessLevelForRole,
  adminUserUpdateSchema,
  hasAdminPortalRole,
} from '../../../../lib/schemas/user';
import { DEFAULT_TENANT_ID } from '../../../../lib/tenant/constants';

export const dynamic = 'force-dynamic';

async function assertUserManagementModule() {
  const flags = await getModuleFlags();
  requireModule(flags, 'isUserManagementEnabled');
}

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    await assertUserManagementModule();

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const users = await listUsersForAdmin(200);
    return NextResponse.json({ users, emailConfig: getResendEmailConfig() });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'User management module is disabled' }, { status: 404 });
    }
    console.error('[admin/users] GET failed', error);
    return NextResponse.json({ error: 'Unable to load users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { session: admin } = await requireAdminSessionWithProfile(request);
    await assertUserManagementModule();

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const payload = adminUserUpdateSchema.parse(await request.json());
    const db = getAdminFirestore();

    if (payload.uid === admin.uid && payload.role && payload.role !== 'admin') {
      return NextResponse.json({ error: 'You cannot demote your own admin account' }, { status: 400 });
    }

    if (payload.uid === admin.uid && payload.disabled === true) {
      return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (payload.role) {
      updates.role = payload.role;
      updates.accessLevel = accessLevelForRole(payload.role);
    }
    if (payload.disabled != null) updates.disabled = payload.disabled;

    await db.collection('users').doc(payload.uid).set(updates, { merge: true });

    if (payload.role) {
      const auth = getAdminAuth();
      if (payload.role === 'admin') {
        await auth.setCustomUserClaims(payload.uid, {
          admin: true,
          role: 'admin',
          tenantId: DEFAULT_TENANT_ID,
        });
      } else if (payload.role === 'user') {
        await auth.setCustomUserClaims(payload.uid, {
          admin: false,
          role: 'user',
          tenantId: DEFAULT_TENANT_ID,
        });
      } else if (hasAdminPortalRole(payload.role)) {
        await auth.setCustomUserClaims(payload.uid, {
          admin: false,
          role: payload.role,
          tenantId: DEFAULT_TENANT_ID,
        });
      }
    }

    await logAdminAction({
      userId: admin.uid,
      action: 'user_update',
      metadata: { targetUid: payload.uid, ...updates },
    });

    return NextResponse.json({ ok: true });
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
    console.error('[admin/users] PATCH failed', error);
    return NextResponse.json({ error: 'Unable to update user' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session: admin } = await requireAdminSessionWithProfile(request);
    await assertUserManagementModule();

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const payload = adminUserInviteSchema.parse(await request.json());
    const normalizedEmail = payload.email.trim().toLowerCase();

    if (payload.persona === 'super_admin' && !isMasterAdminEmail(admin.email)) {
      return NextResponse.json(
        { error: 'Only master admins can invite super admins' },
        { status: 403 }
      );
    }

    const invite = await sendPersonaInvite({
      ...payload,
      email: normalizedEmail,
      invitedBy: admin.uid,
    });

    await logAdminAction({
      userId: admin.uid,
      action: 'user_invite',
      metadata: {
        targetUid: invite.uid,
        email: normalizedEmail,
        persona: payload.persona,
        inviteStatus: invite.inviteStatus,
        inviteId: invite.inviteId,
      },
    });

    return NextResponse.json({
      ok: true,
      uid: invite.uid,
      email: invite.email,
      role: invite.role,
      accessLevel: invite.accessLevel,
      persona: invite.persona,
      inviteId: invite.inviteId,
      inviteStatus: invite.inviteStatus,
      emailSent: invite.emailSent,
      emailDeliveryMethod: invite.emailDeliveryMethod,
      inviteWelcomeUrl: invite.inviteWelcomeUrl,
      error: invite.error,
      passwordResetUrl: invite.passwordResetUrl,
    });
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

    const message = error instanceof Error ? error.message : 'Unable to create user';
    if (message.includes('email-already-exists')) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    console.error('[admin/users] POST failed', error);
    return NextResponse.json({ error: 'Unable to create user' }, { status: 500 });
  }
}
