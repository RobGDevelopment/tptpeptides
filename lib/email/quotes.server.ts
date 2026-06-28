import 'server-only';

import { SITE_URL_PRODUCTION } from '../brand';
import { getModuleFlags } from '../firebase/modules.server';
import { isModuleEnabled } from '../modules/flags';
import { wrapTransactionalEmail } from './templates/transactionalShell';
import { isResendConfigured, sendEmail } from './resend.server';

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL_PRODUCTION;
}

export async function sendQuoteSentEmail(params: {
  email: string;
  customerName: string;
  quoteNumber: string;
  quoteId: string;
  total: number;
  validUntil: string;
}): Promise<boolean> {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTransactionalEmailEnabled')) return false;
  if (!isResendConfigured()) return false;

  const checkoutUrl = `${appBaseUrl()}/checkout/quote?quoteId=${encodeURIComponent(params.quoteId)}`;
  const validDate = new Date(params.validUntil).toLocaleDateString();

  const bodyHtml = `
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">
      Hi ${params.customerName},<br/><br/>
      Quote <strong style="color:#BF953F;">${params.quoteNumber}</strong> is ready for your institution.
      Total: <strong style="color:#BF953F;">$${params.total.toFixed(2)}</strong> · Valid through ${validDate}.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#737373;font-weight:300;">
      Sign in with this email address to complete secure checkout. Net-30 invoicing is available for verified institutions.
    </p>`;

  const html = wrapTransactionalEmail({
    title: 'Institutional Quote Ready',
    bodyHtml,
    cta: { label: 'Review & Checkout', href: checkoutUrl },
  });

  await sendEmail({
    to: params.email,
    subject: `Quote ${params.quoteNumber} — TPT Peptides`,
    html,
    text: `Your quote ${params.quoteNumber} is ready. Checkout: ${checkoutUrl}`,
  });

  return true;
}
