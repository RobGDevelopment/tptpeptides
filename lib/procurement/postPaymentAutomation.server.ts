import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { createOpsException } from '../firebase/exceptions.server';
import { getAdminFirestore } from '../firebase/admin';
import { getOperationsSettings } from '../firebase/operations.server';
import { productDocSchema } from '../schemas/product';
import { isModuleEnabled } from '../modules/flags';
import type { ModuleFlags } from '../schemas/modules';
import { routePurchaseOrder } from './poRouter.server';
import { createAutoShippingLabel } from './autoLabel.server';

export async function runPostPaymentAutomation(
  orderId: string,
  flags: ModuleFlags
): Promise<void> {
  if (!isModuleEnabled(flags, 'isZeroTouchOpsEnabled')) {
    return;
  }

  const settings = await getOperationsSettings();

  if (settings.autoPurchaseOrderEnabled) {
    try {
      await maybeCreateAutoPurchaseOrders(orderId);
    } catch (error) {
      await createOpsException({
        type: 'auto_po_failed',
        orderId,
        message: error instanceof Error ? error.message : 'Auto-PO failed',
      });
    }
  }

  if (settings.autoLabelOnPaidEnabled && isModuleEnabled(flags, 'isRealShippingEnabled')) {
    try {
      await createAutoShippingLabel(orderId, flags);
    } catch (error) {
      await createOpsException({
        type: 'auto_label_failed',
        orderId,
        message: error instanceof Error ? error.message : 'Auto-label failed',
      });
    }
  }
}

async function maybeCreateAutoPurchaseOrders(orderId: string): Promise<void> {
  const db = getAdminFirestore();
  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (!orderSnap.exists) return;

  const items = (orderSnap.data()?.items as Array<{ id: string; quantity: number }>) ?? [];

  for (const item of items) {
    const productSnap = await db.collection('products').doc(item.id).get();
    if (!productSnap.exists) continue;

    const parsed = productDocSchema.safeParse(productSnap.data());
    if (!parsed.success) continue;

    const remainingStock = parsed.data.stock;
    if (remainingStock > parsed.data.reorderThreshold) continue;

    const supplierId = parsed.data.supplierId ?? 'default-supplier';
    await routePurchaseOrder({
      supplierId,
      productId: item.id,
      productName: parsed.data.name,
      reorderQuantity: Math.max(parsed.data.reorderThreshold * 2, 10),
      triggeredByOrderId: orderId,
    });
  }
}

export async function recordStockDecrementSideEffects(
  orderId: string,
  flags: ModuleFlags
): Promise<void> {
  await runPostPaymentAutomation(orderId, flags);
}
