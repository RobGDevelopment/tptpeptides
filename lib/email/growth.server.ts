import 'server-only';

import { SITE_URL_PRODUCTION } from '../brand';
import { getModuleFlags } from '../firebase/modules.server';
import { isModuleEnabled } from '../modules/flags';
import { wrapTransactionalEmail } from './templates/transactionalShell';
import { isResendConfigured, sendEmail } from './resend.server';

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL_PRODUCTION;
}

export async function sendAbandonedCartEmail(params: {
  email: string;
  recoveryToken: string;
  itemCount: number;
  subtotal: number;
}): Promise<boolean> {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isAbandonedCartEnabled')) return false;
  if (!isModuleEnabled(flags, 'isTransactionalEmailEnabled')) return false;
  if (!isResendConfigured()) return false;

  const recoveryUrl = `${appBaseUrl()}/cart/recover?token=${encodeURIComponent(params.recoveryToken)}`;

  const bodyHtml = `
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">
      Your research requisition (${params.itemCount} item${params.itemCount === 1 ? '' : 's'}, $${params.subtotal.toFixed(2)} subtotal) is still saved.
      Resume checkout within one click — inventory is verified at payment.
    </p>`;

  const html = wrapTransactionalEmail({
    title: 'Resume Your Requisition',
    bodyHtml,
    cta: { label: 'Restore Cart', href: recoveryUrl },
  });

  await sendEmail({
    to: params.email,
    subject: 'Your TPT Peptides cart is waiting',
    html,
    text: `Resume your cart: ${recoveryUrl}`,
  });

  return true;
}

export async function sendReplenishmentEmail(params: {
  email: string;
  productName: string;
  productTag: string;
  suggestedQuantity: number;
  recoveryToken?: string;
}): Promise<boolean> {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isPredictiveReplenishmentEnabled')) return false;
  if (!isModuleEnabled(flags, 'isTransactionalEmailEnabled')) return false;
  if (!isResendConfigured()) return false;

  const catalogUrl = `${appBaseUrl()}/catalog`;

  const bodyHtml = `
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">
      Based on your prior ${params.productName} (${params.productTag}) procurement cycle, your lab may be approaching a restock window.
      Suggested reorder quantity: ${params.suggestedQuantity}.
    </p>`;

  const html = wrapTransactionalEmail({
    title: 'Replenishment Signal',
    bodyHtml,
    cta: { label: 'Browse Catalog', href: catalogUrl },
  });

  await sendEmail({
    to: params.email,
    subject: `Restock reminder — ${params.productName}`,
    html,
    text: `Browse catalog: ${catalogUrl}`,
  });

  return true;
}
