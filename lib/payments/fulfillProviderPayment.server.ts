import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { sendOrderConfirmationEmail } from '../email/orderConfirmation.server';
import { getAdminFirestore } from '../firebase/admin';
import { fulfillPaidOrder } from '../firebase/orders.server';
import { getModuleFlags } from '../firebase/modules.server';
import { runPostPaymentAutomation } from '../procurement/postPaymentAutomation.server';
import type { PaymentProviderId } from './types';

export async function fulfillProviderPayment(params: {
  orderId: string;
  providerId: PaymentProviderId;
  transactionId: string;
  email?: string | null;
  amount?: number;
}): Promise<{ alreadyFulfilled: boolean }> {
  const db = getAdminFirestore();
  const orderRef = db.collection('orders').doc(params.orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    throw new Error(`Order ${params.orderId} not found`);
  }

  const order = orderSnap.data()!;
  const result = await fulfillPaidOrder(params.orderId);

  if (!result.alreadyFulfilled) {
    await orderRef.update({
      paymentProviderId: params.providerId,
      providerTransactionId: params.transactionId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const flags = await getModuleFlags();
    await runPostPaymentAutomation(params.orderId, flags);

    const email =
      params.email ??
      (order.guestEmail as string | null | undefined) ??
      null;

    if (email) {
      await sendOrderConfirmationEmail({
        email,
        orderId: params.orderId,
        total: params.amount ?? Number(order.total),
        loyaltyPointsAwarded: result.loyaltyPointsAwarded,
      });
    }
  }

  return { alreadyFulfilled: result.alreadyFulfilled };
}
