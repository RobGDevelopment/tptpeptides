import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../firebase/admin';
import { getOperationsSettings } from '../firebase/operations.server';

export interface PurchaseOrderRouteInput {
  supplierId: string;
  productId: string;
  productName: string;
  reorderQuantity: number;
  triggeredByOrderId?: string;
}

/** Hybrid PO router — Protocol A (email PDF) default; Protocol B (EDI REST) when configured. */
export async function routePurchaseOrder(input: PurchaseOrderRouteInput): Promise<string> {
  const db = getAdminFirestore();
  const supplierSnap = await db.collection('suppliers').doc(input.supplierId).get();

  const supplier = supplierSnap.exists ? supplierSnap.data() : null;
  const protocol = supplier?.poProtocol === 'edi_rest' ? 'edi_rest' : 'email_pdf';

  const poRef = await db.collection('purchaseOrders').add({
    supplierId: input.supplierId,
    items: [
      {
        id: input.productId,
        name: input.productName,
        quantity: input.reorderQuantity,
      },
    ],
    status: 'pending_supplier_review',
    protocol,
    triggeredByOrderId: input.triggeredByOrderId ?? null,
    generatedAt: FieldValue.serverTimestamp(),
  });

  if (protocol === 'edi_rest') {
    try {
      await sendEdiPurchaseOrder({
        poId: poRef.id,
        supplierId: input.supplierId,
        ediEndpoint: String(supplier?.ediEndpoint ?? ''),
        payload: input,
      });
    } catch (error) {
      // Failover to Protocol A
      await sendEmailPurchaseOrder({
        poId: poRef.id,
        supplierEmail: String(supplier?.email ?? process.env.OPS_ALERT_EMAIL ?? ''),
        payload: input,
      });
      await poRef.update({
        protocol: 'email_pdf',
        failoverReason: error instanceof Error ? error.message : 'EDI failed',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  } else {
    await sendEmailPurchaseOrder({
      poId: poRef.id,
      supplierEmail: String(supplier?.email ?? process.env.OPS_ALERT_EMAIL ?? ''),
      payload: input,
    });
  }

  return poRef.id;
}

async function sendEmailPurchaseOrder(params: {
  poId: string;
  supplierEmail: string;
  payload: PurchaseOrderRouteInput;
}): Promise<void> {
  if (!params.supplierEmail.trim()) {
    throw new Error('Supplier email is not configured for Protocol A PO routing');
  }

  // VERIFY WITH SANDBOX — wire Resend PDF attachment in production hardening.
  console.info('[poRouter] Protocol A queued', {
    poId: params.poId,
    supplierEmail: params.supplierEmail,
    productId: params.payload.productId,
    quantity: params.payload.reorderQuantity,
  });
}

async function sendEdiPurchaseOrder(params: {
  poId: string;
  supplierId: string;
  ediEndpoint: string;
  payload: PurchaseOrderRouteInput;
}): Promise<void> {
  if (!params.ediEndpoint.trim()) {
    throw new Error('Supplier EDI endpoint is not configured');
  }

  const settings = await getOperationsSettings();
  void settings;

  const response = await fetch(params.ediEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPPLIER_EDI_TOKEN?.trim() ?? ''}`,
    },
    body: JSON.stringify({
      poId: params.poId,
      supplierId: params.supplierId,
      lines: [
        {
          sku: params.payload.productId,
          quantity: params.payload.reorderQuantity,
        },
      ],
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Supplier EDI endpoint returned ${response.status}`);
  }
}
