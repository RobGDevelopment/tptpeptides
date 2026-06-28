import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getSalesWorkspaceSnapshot } from '../../../../lib/firebase/sales.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { ModuleDisabledError, requireModule } from '../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isSalesCommandCenterEnabled');

    const workspace = await getSalesWorkspaceSnapshot();
    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Sales Command Center is disabled' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to load sales workspace' }, { status: 500 });
  }
}
