import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import { listOpenOpsExceptions, resolveOpsException } from '../../../../lib/firebase/exceptions.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    if (!isModuleEnabled(flags, 'isZeroTouchOpsEnabled')) {
      return NextResponse.json({ error: 'Zero-touch ops is not enabled.' }, { status: 404 });
    }

    const exceptions = await listOpenOpsExceptions();
    return NextResponse.json({ exceptions });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to load exceptions' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    if (!isModuleEnabled(flags, 'isZeroTouchOpsEnabled')) {
      return NextResponse.json({ error: 'Zero-touch ops is not enabled.' }, { status: 404 });
    }

    const body = (await request.json()) as { exceptionId?: string };
    if (!body.exceptionId?.trim()) {
      return NextResponse.json({ error: 'exceptionId is required' }, { status: 400 });
    }

    await resolveOpsException(body.exceptionId.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to resolve exception' }, { status: 500 });
  }
}
