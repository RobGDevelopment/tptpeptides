import { NextResponse } from 'next/server';
import { z } from 'zod';
import { inviteAllMasterAdmins } from '../../../../lib/admin/inviteMasterAdmins.server';
import { isMasterAdminEmail } from '../../../../lib/admin/masterAdmin';
import {
  AdminAuthError,
  requireAdminSession,
} from '../../../../lib/firebase/adminAuth.server';
import { isResendConfigured } from '../../../../lib/email/resend.server';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  siteUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession(request);

    if (!isMasterAdminEmail(session.email)) {
      return NextResponse.json({ error: 'Only master admins can send super-admin invites' }, { status: 403 });
    }

    const body = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid siteUrl' }, { status: 400 });
    }

    const results = await inviteAllMasterAdmins({
      siteUrl: body.data.siteUrl,
      triggeredByUid: session.uid,
    });

    return NextResponse.json({
      ok: true,
      resendConfigured: isResendConfigured(),
      results,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[admin/master-admin-invite] failed', error);
    return NextResponse.json({ error: 'Unable to send master admin invites' }, { status: 500 });
  }
}
