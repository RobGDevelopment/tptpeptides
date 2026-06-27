import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { listVerificationsByStatus } from '../../../../lib/firebase/verification.server';
import { ModuleDisabledError, requireB2BProcurement } from '../../../../lib/modules/b2b.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireB2BProcurement(flags, 'isInstitutionVerificationEnabled');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'pending';

    if (status !== 'pending' && status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    const verifications = await listVerificationsByStatus(status);
    return NextResponse.json({ verifications });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Institution verification module is disabled' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to load verifications' }, { status: 500 });
  }
}
