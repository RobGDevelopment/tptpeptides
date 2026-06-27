import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getModuleFlags, writeModuleFlags } from '../../../../lib/firebase/modules.server';
import { moduleFlagsPatchSchema } from '../../../../lib/schemas/modules';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    return NextResponse.json({ flags });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[admin/modules] GET failed', error);
    return NextResponse.json({ error: 'Unable to load module flags' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdminSession(request);
    const body = moduleFlagsPatchSchema.parse(await request.json());

    const flags = await writeModuleFlags(body, session.uid);
    revalidateTag('module-flags', 'max');

    await logAdminAction({
      userId: session.uid,
      action: 'modules_update',
      metadata: { keys: Object.keys(body) },
    });

    return NextResponse.json({ flags });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid module flags payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update module flags' }, { status: 500 });
  }
}
