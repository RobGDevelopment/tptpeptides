import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  variantIds: z.array(z.string()).min(1),
  supplierId: z.string().default('default-supplier'),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection('purchaseOrders')
      .orderBy('generatedAt', 'desc')
      .limit(50)
      .get();

    const purchaseOrders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      generatedAt: doc.data().generatedAt?.toDate?.()?.toISOString?.() ?? null,
      approvedAt: doc.data().approvedAt?.toDate?.()?.toISOString?.() ?? null,
    }));

    return NextResponse.json({ purchaseOrders });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[admin/purchase-orders] GET failed', error);
    return NextResponse.json({ error: 'Unable to load purchase orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession(request);

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const { variantIds, supplierId } = bodySchema.parse(await request.json());
    const db = getAdminFirestore();
    const refs = variantIds.map((id) => db.collection('products').doc(id));
    const snapshots = await db.getAll(...refs);

    const items = snapshots
      .filter((snap) => snap.exists)
      .map((snap) => {
        const data = snap.data()!;
        return {
          id: snap.id,
          name: String(data.name),
          tag: String(data.tag),
          price: Number(data.price),
          stock: Number(data.stock ?? 0),
          baseCost: data.baseCost != null ? Number(data.baseCost) : null,
        };
      });

    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid variants found' }, { status: 400 });
    }

    const totalBaseCost = items.reduce(
      (sum, item) => sum + (item.baseCost ?? 0) * Math.max(1, 50 - item.stock),
      0
    );

    const poRef = await db.collection('purchaseOrders').add({
      supplierId,
      items,
      totalBaseCost: Math.round(totalBaseCost * 100) / 100,
      status: 'pending_supplier_review',
      generatedAt: new Date(),
      generatedBy: admin.uid,
    });

    await logAdminAction({
      userId: admin.uid,
      action: 'purchase_order_draft',
      metadata: { poId: poRef.id, variantCount: items.length, totalBaseCost },
    });

    return NextResponse.json({
      ok: true,
      poId: poRef.id,
      totalBaseCost: Math.round(totalBaseCost * 100) / 100,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('[admin/purchase-orders] POST failed', error);
    return NextResponse.json({ error: 'Unable to create purchase order' }, { status: 500 });
  }
}

const patchSchema = z.object({
  poId: z.string().min(1),
  action: z.enum(['approve', 'export']),
});

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminSession(request);

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const { poId, action } = patchSchema.parse(await request.json());
    const db = getAdminFirestore();
    const poRef = db.collection('purchaseOrders').doc(poId);
    const poSnap = await poRef.get();

    if (!poSnap.exists) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    const data = poSnap.data()!;

    if (action === 'approve') {
      await poRef.update({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: admin.uid,
      });
    }

    await logAdminAction({
      userId: admin.uid,
      action: `purchase_order_${action}`,
      metadata: { poId },
    });

    const csvHeader = 'id,name,tag,stock,baseCost\n';
    const csvRows = (data.items as { id: string; name: string; tag: string; stock: number; baseCost: number | null }[])
      .map((item) =>
        [item.id, item.name, item.tag, item.stock, item.baseCost ?? ''].join(',')
      )
      .join('\n');

    return NextResponse.json({
      ok: true,
      status: action === 'approve' ? 'approved' : data.status,
      exportCsv: action === 'export' ? csvHeader + csvRows : undefined,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('[admin/purchase-orders] PATCH failed', error);
    return NextResponse.json({ error: 'Unable to update purchase order' }, { status: 500 });
  }
}
