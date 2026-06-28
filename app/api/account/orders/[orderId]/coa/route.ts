import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '../../../../../../lib/firebase/auth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  if (!isAdminSdkConfigured()) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const sessionUser = await getSessionUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isBatchCoaEnabled')) {
    return NextResponse.json({ error: 'Batch documentation is not available' }, { status: 404 });
  }

  const { orderId } = await context.params;
  const db = getAdminFirestore();
  const orderSnap = await db.collection('orders').doc(orderId).get();

  if (!orderSnap.exists) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = orderSnap.data()!;
  if (order.userId !== sessionUser.uid) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const items = ((order.items as Record<string, unknown>[]) ?? []).map((item) => ({
    name: String(item.name ?? ''),
    tag: String(item.tag ?? ''),
    lotNumber: (item.lotNumber as string | null | undefined) ?? null,
    coaUrl: (item.coaUrl as string | null | undefined) ?? null,
    batchId: (item.batchId as string | null | undefined) ?? null,
  }));

  return NextResponse.json({
    orderId,
    documents: items.filter((item) => item.coaUrl || item.lotNumber),
  });
}
