import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildQuickBooksOrdersCsv,
  mapFirestoreOrderToExport,
} from '../../../../lib/accounting/quickbooksExport';
import { AdminAuthError, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { listOrdersForExport } from '../../../../lib/firebase/orders.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { ModuleDisabledError, requireModule } from '../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isAccountingExportEnabled');

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Provide startDate and endDate as YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const rows = await listOrdersForExport(parsed.data);
    const exportRows = rows
      .map(({ id, data }) => mapFirestoreOrderToExport(id, data))
      .filter((row): row is NonNullable<typeof row> => row != null);

    const csv = buildQuickBooksOrdersCsv(exportRows);
    const filename = `tptpeptides-orders_${parsed.data.startDate}_${parsed.data.endDate}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Accounting export module is disabled' }, { status: 404 });
    }
    console.error('[admin/export-orders] failed', error);
    return NextResponse.json({ error: 'Unable to export orders' }, { status: 500 });
  }
}
