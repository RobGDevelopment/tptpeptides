import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { createBatch, listBatches } from '../../../../lib/firebase/batches.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { adminBatchCreateSchema } from '../../../../lib/schemas/batch';
import { ModuleDisabledError, requireModule } from '../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isBatchCoaEnabled');

    const batches = await listBatches();
    return NextResponse.json({ batches });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Batch & COA module is disabled' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to load batches' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isBatchCoaEnabled');

    const body = adminBatchCreateSchema.parse(await request.json());
    const result = await createBatch(body, admin.uid);

    await logAdminAction({
      userId: admin.uid,
      action: 'batch_created',
      metadata: { batchId: result.id, lotNumber: result.batch.lotNumber },
    });

    return NextResponse.json({ batch: { id: result.id, ...result.batch } });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Batch & COA module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid batch request' }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to create batch' }, { status: 500 });
  }
}
