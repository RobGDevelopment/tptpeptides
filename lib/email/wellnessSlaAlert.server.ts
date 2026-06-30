import 'server-only';

import { getModuleFlags } from '../firebase/modules.server';
import { isModuleEnabled } from '../modules/flags';
import { wrapTransactionalEmail } from './templates/transactionalShell';
import { isResendConfigured, sendEmail } from './resend.server';
import type { StaleIntakeRow } from '../wellness/intakeSla.server';

function wellnessAlertEmail(): string | null {
  return (
    process.env.OPS_ALERT_EMAIL?.trim() ||
    process.env.WELLNESS_SLA_ALERT_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.match(/<([^>]+)>/)?.[1] ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    null
  );
}

function formatPatientName(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || 'Unknown patient';
}

export async function sendWellnessSlaAlertEmail(intakes: StaleIntakeRow[]): Promise<boolean> {
  if (intakes.length === 0) return false;

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTransactionalEmailEnabled')) return false;
  if (!isResendConfigured()) return false;

  const to = wellnessAlertEmail();
  if (!to) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medfit-pro.vercel.app';
  const lines = intakes
    .slice(0, 25)
    .map((intake) => {
      const submitted = new Date(intake.submittedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      return `<li style="margin:6px 0;color:#A3A3A3;">${formatPatientName(intake.firstName, intake.lastName)} — submitted ${submitted} (<code>${intake.id.slice(0, 8)}…</code>)</li>`;
    })
    .join('');

  const bodyHtml = `
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">
      ${intakes.length} medical intake${intakes.length === 1 ? '' : 's'} have been waiting more than 24 hours for provider review.
    </p>
    <ul style="font-size:13px;line-height:1.5;padding-left:18px;">${lines}</ul>`;

  const html = wrapTransactionalEmail({
    title: 'Wellness Intake SLA Alert',
    bodyHtml,
    cta: { label: 'Open Intake Queue', href: `${appUrl}/admin/wellness/intakes` },
  });

  await sendEmail({
    to,
    subject: `[TPT Clinic] ${intakes.length} intake${intakes.length === 1 ? '' : 's'} past 24h SLA`,
    html,
    text: `${intakes.length} intakes are past the 24-hour review SLA. Open ${appUrl}/admin/wellness/intakes`,
  });

  return true;
}
