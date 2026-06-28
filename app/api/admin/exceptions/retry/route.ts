import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';
import { retryOpsException } from '../../../../../lib/ops/retryException.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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

    const result = await retryOpsException(body.exceptionId.trim(), flags);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to retry exception' }, { status: 500 });
  }
}
