import 'server-only';

import { SITE_NAME, SITE_URL_PRODUCTION } from '../brand';
import { getModuleFlags } from '../firebase/modules.server';
import { isModuleEnabled } from '../modules/flags';
import { wrapTransactionalEmail } from './templates/transactionalShell';
import { isResendConfigured, sendEmail } from './resend.server';

function accountUrl(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL_PRODUCTION}/account`;
}

export function buildShippingNotificationEmail(params: {
  orderId: string;
  trackingNumber?: string | null;
  carrier?: string | null;
}): { subject: string; html: string; text: string } {
  const shortId = params.orderId.slice(-8).toUpperCase();
  const subject = `${SITE_NAME} — Shipment Dispatched (#${shortId})`;

  const trackingBlock =
    params.trackingNumber && params.trackingNumber.trim()
      ? `<div style="margin:32px 0;padding:24px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">
      <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">Tracking</p>
      <p style="margin:0;font-family:monospace;font-size:14px;color:#E8E8E8;">${params.trackingNumber}</p>
      ${params.carrier ? `<p style="margin:12px 0 0;font-size:12px;color:#737373;">Carrier: ${params.carrier}</p>` : ''}
    </div>`
      : '';

  const bodyHtml = `
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">Your research requisition has entered outbound logistics. Cold-chain handling protocols apply per your order manifest.</p>
    <div style="margin:32px 0;padding:24px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">
      <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">Order ID</p>
      <p style="margin:0;font-family:monospace;font-size:14px;color:#E8E8E8;">${params.orderId}</p>
    </div>
    ${trackingBlock}`;

  const html = wrapTransactionalEmail({
    title: 'Shipment Dispatched',
    bodyHtml,
    cta: { label: 'View Order History', href: accountUrl() },
  });

  const text = [
    `${SITE_NAME} — Shipment Dispatched`,
    `Order ID: ${params.orderId}`,
    params.trackingNumber ? `Tracking: ${params.trackingNumber}` : '',
    params.carrier ? `Carrier: ${params.carrier}` : '',
    accountUrl(),
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

export async function sendShippingNotificationEmail(params: {
  email: string;
  orderId: string;
  trackingNumber?: string | null;
  carrier?: string | null;
}): Promise<void> {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTransactionalEmailEnabled')) {
    console.info('[email] Transactional email disabled — shipping notification logged only', {
      orderId: params.orderId,
    });
    return;
  }

  if (!isResendConfigured()) {
    console.warn('[email] RESEND_API_KEY missing — shipping email skipped');
    return;
  }

  const payload = buildShippingNotificationEmail(params);
  await sendEmail({
    to: params.email,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}
