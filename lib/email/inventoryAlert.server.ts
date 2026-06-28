import 'server-only';

import { getModuleFlags } from '../firebase/modules.server';
import { isModuleEnabled } from '../modules/flags';
import { wrapTransactionalEmail } from './templates/transactionalShell';
import { isResendConfigured, sendEmail } from './resend.server';
import type { LowStockVariant } from '../firebase/inventoryAlerts.server';

function opsAlertEmail(): string | null {
  return (
    process.env.OPS_ALERT_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.match(/<([^>]+)>/)?.[1] ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    null
  );
}

export async function sendLowStockAlertEmail(variants: LowStockVariant[]): Promise<boolean> {
  if (variants.length === 0) return false;

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTransactionalEmailEnabled')) return false;
  if (!isResendConfigured()) return false;

  const to = opsAlertEmail();
  if (!to) return false;

  const lines = variants
    .slice(0, 25)
    .map((v) => `<li style="margin:6px 0;color:#A3A3A3;">${v.name} (${v.tag}) — ${v.stock} units remaining</li>`)
    .join('');

  const bodyHtml = `
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">
      ${variants.length} SKU${variants.length === 1 ? '' : 's'} at or below the low-stock threshold.
    </p>
    <ul style="font-size:13px;line-height:1.5;padding-left:18px;">${lines}</ul>`;

  const html = wrapTransactionalEmail({
    title: 'Low Stock Alert',
    bodyHtml,
    cta: { label: 'Open Inventory', href: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://medfit-pro.vercel.app'}/admin/inventory` },
  });

  await sendEmail({
    to,
    subject: `[TPT] Low stock alert — ${variants.length} SKU${variants.length === 1 ? '' : 's'}`,
    html,
    text: `${variants.length} variants below threshold. Review /admin/inventory`,
  });

  return true;
}
