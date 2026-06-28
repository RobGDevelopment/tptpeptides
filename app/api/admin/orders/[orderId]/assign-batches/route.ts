import { NextResponse } from 'next/server';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../../lib/firebase/adminAuth.server';
import { assignBatchesToOrder, listActiveBatchesForProduct } from '../../../../../../lib/firebase/batches.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../../../lib/firebase/modules.server';
import { ModuleDisabledError, requireModule } from '../../../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isBatchCoaEnabled');

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const { orderId } = await context.params;
    const db = getAdminFirestore();
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const items = (orderSnap.data()?.items as { id: string; quantity: number }[]) ?? [];
    const assignments: { productId: string; batchId: string }[] = [];

    for (const item of items) {
      const batches = await listActiveBatchesForProduct(item.id);
      const batch = batches.find((row) => row.quantityAvailable >= item.quantity);
      if (!batch) {
        return NextResponse.json(
          { error: `No active batch with sufficient quantity for product ${item.id}` },
          { status: 400 }
        );
      }
      assignments.push({ productId: item.id, batchId: batch.id });
    }

    await assignBatchesToOrder({ orderId, assignments });

    await logAdminAction({
      userId: admin.uid,
      action: 'order_batches_assigned',
      metadata: { orderId, assignmentCount: assignments.length },
    });

    return NextResponse.json({ ok: true, assignments });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Batch & COA module is disabled' }, { status: 404 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to assign batches' }, { status: 500 });
  }
}
