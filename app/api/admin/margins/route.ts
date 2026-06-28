import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { buildMarginReport } from '../../../../lib/firebase/margin.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { ModuleDisabledError, requireModule } from '../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isMarginReportingEnabled');

    const { searchParams } = new URL(request.url);
    const report = await buildMarginReport({
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
    });

    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Margin reporting is disabled' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to build margin report' }, { status: 500 });
  }
}
