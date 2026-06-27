import 'server-only';

import { getModuleFlags } from '../firebase/modules.server';
import { isModuleEnabled } from '../modules/flags';
import { buildOrderConfirmationEmail, isResendConfigured, sendEmail } from './resend.server';

/**
 * Order confirmation delivery via Resend when the transactional email module is enabled.
 * Stripe may also send a payment receipt when configured in the Dashboard.
 */
export async function sendOrderConfirmationEmail(params: {
  email: string;
  orderId: string;
  total: number;
  loyaltyPointsAwarded?: number;
}): Promise<void> {
  const flags = await getModuleFlags();
  const moduleOn = isModuleEnabled(flags, 'isTransactionalEmailEnabled');

  if (!moduleOn) {
    console.info('[email] Transactional email module disabled — order confirmation logged only', {
      to: params.email,
      orderId: params.orderId,
    });
    return;
  }

  if (!isResendConfigured()) {
    console.warn('[email] isTransactionalEmailEnabled but RESEND_API_KEY missing', {
      orderId: params.orderId,
    });
    return;
  }

  const { subject, html, text } = buildOrderConfirmationEmail({
    orderId: params.orderId,
    total: params.total,
    loyaltyPointsAwarded: params.loyaltyPointsAwarded,
  });

  const result = await sendEmail({
    to: params.email,
    subject,
    html,
    text,
  });

  console.info('[email] Order confirmation sent', {
    to: params.email,
    orderId: params.orderId,
    resendId: result?.id ?? null,
  });
}
