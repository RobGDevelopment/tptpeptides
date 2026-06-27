import 'server-only';

import { SITE_NAME, SITE_URL_PRODUCTION } from '../brand';
import { getModuleFlags } from '../firebase/modules.server';
import { isModuleEnabled } from '../modules/flags';
import { wrapTransactionalEmail } from './templates/transactionalShell';
import { isResendConfigured, sendEmail } from './resend.server';

function accountUrl(path = '/account'): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL_PRODUCTION}${path}`;
}

export function buildVerificationApprovedEmail(params: {
  institutionName: string;
  institutionTier: string;
}): { subject: string; html: string; text: string } {
  const subject = `${SITE_NAME} — Institution Verified (${params.institutionTier})`;
  const bodyHtml = `
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">Your institution verification for <strong style="color:#E8E8E8;">${params.institutionName}</strong> has been approved.</p>
    <div style="margin:32px 0;padding:24px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">
      <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">Pricing Tier</p>
      <p style="margin:0;font-size:18px;color:#BF953F;">${params.institutionTier}</p>
    </div>
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">B2B tier pricing is now applied at checkout when the tiered pricing module is enabled.</p>`;

  const html = wrapTransactionalEmail({
    title: 'Institution Verified',
    bodyHtml,
    cta: { label: 'Open Client Portal', href: accountUrl('/account') },
  });

  const text = [
    `${SITE_NAME} — Institution Verified`,
    `Institution: ${params.institutionName}`,
    `Tier: ${params.institutionTier}`,
    accountUrl('/account'),
  ].join('\n');

  return { subject, html, text };
}

export function buildVerificationRejectedEmail(params: {
  institutionName: string;
  rejectionReason: string;
}): { subject: string; html: string; text: string } {
  const subject = `${SITE_NAME} — Verification Requires Attention`;
  const bodyHtml = `
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">We were unable to approve the verification request for <strong style="color:#E8E8E8;">${params.institutionName}</strong>.</p>
    <div style="margin:32px 0;padding:24px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">
      <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">Reviewer Note</p>
      <p style="margin:0;font-size:14px;color:#E8E8E8;line-height:1.6;">${params.rejectionReason}</p>
    </div>
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">You may submit updated documentation from the client portal.</p>`;

  const html = wrapTransactionalEmail({
    title: 'Verification Not Approved',
    bodyHtml,
    cta: { label: 'Resubmit Verification', href: accountUrl('/account/verify') },
  });

  const text = [
    `${SITE_NAME} — Verification Not Approved`,
    `Institution: ${params.institutionName}`,
    `Reason: ${params.rejectionReason}`,
    accountUrl('/account/verify'),
  ].join('\n');

  return { subject, html, text };
}

export async function sendVerificationDecisionEmail(params: {
  email: string;
  institutionName: string;
  decision: 'approved' | 'rejected';
  institutionTier?: string;
  rejectionReason?: string;
}): Promise<void> {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTransactionalEmailEnabled')) {
    console.info('[email] Transactional email disabled — verification decision logged only', params);
    return;
  }

  if (!isResendConfigured()) {
    console.warn('[email] RESEND_API_KEY missing — verification email skipped');
    return;
  }

  const payload =
    params.decision === 'approved'
      ? buildVerificationApprovedEmail({
          institutionName: params.institutionName,
          institutionTier: params.institutionTier ?? 'Bronze',
        })
      : buildVerificationRejectedEmail({
          institutionName: params.institutionName,
          rejectionReason: params.rejectionReason ?? 'Documentation did not meet requirements.',
        });

  await sendEmail({
    to: params.email,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}
