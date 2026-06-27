import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isMasterAdminEmail } from '../../../../../lib/admin/masterAdmin';
import {
  AdminAuthError,
  requireAdminSession,
} from '../../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { buildInviteEmailPreview } from '../../../../../lib/email/invitePreview.server';
import { ModuleDisabledError, requireModule } from '../../../../../lib/modules/requireModule.server';
import { invitePreviewSchema } from '../../../../../lib/schemas/invitation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isUserManagementEnabled');

    const payload = invitePreviewSchema.parse(await request.json());

    if (payload.persona === 'super_admin' && !isMasterAdminEmail(session.email)) {
      return NextResponse.json(
        { error: 'Only master admins can preview super-admin invites' },
        { status: 403 }
      );
    }

    const preview = buildInviteEmailPreview(payload);
    return NextResponse.json({ ok: true, ...preview });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'User management module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid preview request' }, { status: 400 });
    }
    console.error('[admin/invitations/preview] failed', error);
    return NextResponse.json({ error: 'Unable to render preview' }, { status: 500 });
  }
}
