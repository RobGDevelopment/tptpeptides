import 'server-only';

import { getAdminFirestore } from '../firebase/admin';
import type { ShippingAddress } from '../schemas/user';
import { isModuleEnabled } from '../modules/flags';
import type { ModuleFlags } from '../schemas/modules';
import { resolveShippingProvider } from '../shipping/resolveShippingProvider.server';

export async function createAutoShippingLabel(
  orderId: string,
  flags: ModuleFlags
): Promise<void> {
  if (!isModuleEnabled(flags, 'isRealShippingEnabled')) {
    return;
  }

  const db = getAdminFirestore();
  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return;

  const order = orderSnap.data()!;
  if (order.trackingNumber) return;

  const items = (order.items as unknown[]) ?? [];
  let address: ShippingAddress | null = null;

  const userId = order.userId as string | null | undefined;
  if (userId) {
    const userSnap = await db.collection('users').doc(userId).get();
    address = (userSnap.data()?.shippingAddress as ShippingAddress | undefined) ?? null;
  }

  if (!address?.postalCode || !address.state) {
    throw new Error('Customer shipping address is required before auto-label');
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
}
