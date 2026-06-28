import { NextResponse } from 'next/server';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../../../lib/firebase/modules.server';
import type { ShippingAddress } from '../../../../../../lib/schemas/user';
import { ModuleDisabledError, requireModule } from '../../../../../../lib/modules/requireModule.server';
import { resolveShippingProvider } from '../../../../../../lib/shipping/resolveShippingProvider.server';
import { isEasyPostConfigured } from '../../../../../../lib/shipping/easypost.server';
import { isShipStationConfigured } from '../../../../../../lib/shipping/providers/shipstation.server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isRealShippingEnabled');

    if (!isEasyPostConfigured() && !isShipStationConfigured()) {
      return NextResponse.json(
        { error: 'No shipping provider is configured. Set EASYPOST_API_KEY or ShipStation credentials.' },
        { status: 503 }
      );
    }

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const { orderId } = await context.params;
    const db = getAdminFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data()!;
    const items = (order.items as unknown[]) ?? [];
    let address: ShippingAddress | null = null;

    const userId = order.userId as string | null | undefined;
    if (userId) {
      const userSnap = await db.collection('users').doc(userId).get();
      address = (userSnap.data()?.shippingAddress as ShippingAddress | undefined) ?? null;
    }

    if (!address?.postalCode || !address.state) {
      return NextResponse.json(
        { error: 'Customer shipping address is required before creating a label.' },
        { status: 400 }
      );
    }

    const provider = await resolveShippingProvider();
    const label = await provider.buyLabel({
      toPostalCode: address.postalCode,
      toState: address.state,
      toCountry: address.country ?? 'US',
      itemCount: Math.max(items.length, 1),
    });

    await orderRef.update({
      trackingNumber: label.trackingNumber,
      carrier: label.carrier,
      shippingLabelUrl: label.labelUrl,
      trackerUrl: label.publicTrackerUrl,
      shippingCostActual: label.rate,
      status: order.status === 'paid' ? 'processing' : order.status,
      updatedAt: new Date(),
    });

    await logAdminAction({
      userId: admin.uid,
      action: 'order_label_created',
      metadata: { orderId, trackingNumber: label.trackingNumber, carrier: label.carrier },
    });

    return NextResponse.json({
      ok: true,
      trackingNumber: label.trackingNumber,
      carrier: label.carrier,
      labelUrl: label.labelUrl,
      trackerUrl: label.publicTrackerUrl,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Carrier shipping module is disabled' }, { status: 404 });
    }
    if (error instanceof Error) {
      console.error('[admin/orders/ship] failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unable to create shipping label' }, { status: 500 });
  }
}
