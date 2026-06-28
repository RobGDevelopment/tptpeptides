import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { updateBatchStatus } from '../../../../../lib/firebase/batches.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { batchStatusSchema } from '../../../../../lib/schemas/batch';
import { ModuleDisabledError, requireModule } from '../../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ batchId: string }>;
}

const patchSchema = z.object({
  status: batchStatusSchema,
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isBatchCoaEnabled');

    const { batchId } = await context.params;
    const body = patchSchema.parse(await request.json());
    await updateBatchStatus(batchId, body.status);

    await logAdminAction({
      userId: admin.uid,
      action: 'batch_status_update',
      metadata: { batchId, status: body.status },
    });

    return NextResponse.json({ ok: true, batchId, status: body.status });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Batch & COA module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid batch update' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update batch' }, { status: 500 });
  }
}
