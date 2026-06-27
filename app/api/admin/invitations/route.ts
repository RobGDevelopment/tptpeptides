import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AdminAuthError,
  requireAdminSession,
} from '../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import {
  getInviteContextByEmail,
  getInviteContextForUser,
} from '../../../../lib/firebase/invitations.server';
import { ModuleDisabledError, requireModule } from '../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  targetUid: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isUserManagementEnabled');

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      targetUid: searchParams.get('targetUid') ?? undefined,
      email: searchParams.get('email') ?? undefined,
    });

    if (!parsed.targetUid && !parsed.email) {
      return NextResponse.json(
        { error: 'Provide targetUid or email query parameter' },
        { status: 400 }
      );
    }

    const context = parsed.targetUid
      ? await getInviteContextForUser(parsed.targetUid)
      : await getInviteContextByEmail(parsed.email!);

    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...context });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'User management module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }
    console.error('[admin/invitations] GET failed', error);
    return NextResponse.json({ error: 'Unable to load invitation' }, { status: 500 });
  }
}
