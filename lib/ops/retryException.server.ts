import 'server-only';

import type { ModuleFlags } from '../schemas/modules';
import { getOpsException, resolveOpsException } from '../firebase/exceptions.server';
import { getOperationsSettings } from '../firebase/operations.server';
import { isModuleEnabled } from '../modules/flags';
import { createAutoShippingLabel } from '../procurement/autoLabel.server';
import { routePurchaseOrder } from '../procurement/poRouter.server';
import { getAdminFirestore } from '../firebase/admin';
import { productDocSchema } from '../schemas/product';

export async function retryOpsException(
  exceptionId: string,
  flags: ModuleFlags
): Promise<{ ok: true; message: string }> {
  if (!isModuleEnabled(flags, 'isZeroTouchOpsEnabled')) {
    throw new Error('Zero-touch ops is not enabled');
  }

  const exception = await getOpsException(exceptionId);
  if (!exception) {
    throw new Error('Exception not found');
  }

  if (exception.status !== 'open') {
    throw new Error('Exception is already closed');
  }

  const orderId = exception.orderId;
  if (!orderId) {
    throw new Error('Exception has no linked order — manual resolution required');
  }

  switch (exception.type) {
    case 'auto_po_failed': {
      const settings = await getOperationsSettings();
      if (!settings.autoPurchaseOrderEnabled) {
        throw new Error('Auto-PO is disabled in operations settings');
      }
      await retryAutoPurchaseOrders(orderId);
      await resolveOpsException(exceptionId);
      return { ok: true, message: 'Purchase order routing retried successfully' };
    }
    case 'auto_label_failed': {
      if (!isModuleEnabled(flags, 'isRealShippingEnabled')) {
        throw new Error('Real shipping is not enabled');
      }
      await createAutoShippingLabel(orderId, flags);
      await resolveOpsException(exceptionId);
      return { ok: true, message: 'Shipping label creation retried successfully' };
    }
    case 'tracking_webhook_failed':
      throw new Error('Tracking webhook retries require manual carrier update in Orders admin');
    case 'lexical_quarantine':
      throw new Error('Lexical quarantine exceptions must be resolved manually');
    default: {
      const exhaustive: never = exception.type;
      throw new Error(`Unsupported exception type: ${String(exhaustive)}`);
    }
  }
}

async function retryAutoPurchaseOrders(orderId: string): Promise<void> {
  const db = getAdminFirestore();
  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (!orderSnap.exists) {
    throw new Error(`Order ${orderId} not found`);
  }

  const items = (orderSnap.data()?.items as Array<{ id: string; quantity: number }>) ?? [];

  for (const item of items) {
    const productSnap = await db.collection('products').doc(item.id).get();
    if (!productSnap.exists) continue;

    const parsed = productDocSchema.safeParse(productSnap.data());
    if (!parsed.success) continue;

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
