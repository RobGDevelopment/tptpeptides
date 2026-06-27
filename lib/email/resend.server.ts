import 'server-only';

import { SITE_NAME, SITE_SUPPORT_EMAIL, SITE_URL_PRODUCTION } from '../brand';

const RESEND_API_URL = 'https://api.resend.com/emails';

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || `TPTPeptides <orders@${SITE_SUPPORT_EMAIL.split('@')[1] ?? 'tptpeptides.com'}>`;
}

/** True when using Resend's test sender — only delivers to the Resend account email. */
export function isResendSandboxMode(): boolean {
  const from = getFromAddress().toLowerCase();
  return from.includes('@resend.dev');
}

export function getResendEmailConfig(): {
  configured: boolean;
  sandboxMode: boolean;
  fromAddress: string;
} {
  return {
    configured: isResendConfigured(),
    sandboxMode: isResendSandboxMode(),
    fromAddress: getFromAddress(),
  };
}

function formatResendApiError(status: number, body: string): string {
  let apiMessage = body;
  try {
    const parsed = JSON.parse(body) as { message?: string };
    if (parsed.message) apiMessage = parsed.message;
  } catch {
    // keep raw body
  }

  if (
    status === 403 &&
    (/testing emails to your own/i.test(apiMessage) ||
      isResendSandboxMode() ||
      /resend\.dev/i.test(apiMessage))
  ) {
    return (
      'Resend test mode (onboarding@resend.dev) only sends to your Resend account email. ' +
      'Verify a domain at resend.com/domains, set RESEND_FROM_EMAIL to e.g. invites@tptpeptides.com, ' +
      'update Vercel env vars, and redeploy. Until then, use Copy Link below to share the password-set URL.'
    );
  }

  return apiMessage.trim() || `Resend send failed (${status})`;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string } | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not configured — skipping send');
    return null;
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo ?? SITE_SUPPORT_EMAIL,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('[email] Resend API error', response.status, body);
    throw new Error(formatResendApiError(response.status, body));
  }

  const data = (await response.json()) as { id: string };
  return data;
}

export function buildOrderConfirmationEmail(params: {
  orderId: string;
  total: number;
  loyaltyPointsAwarded?: number;
}): { subject: string; html: string; text: string } {
  const accountUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL_PRODUCTION}/account`;
  const subject = `${SITE_NAME} — Requisition Authorized (#${params.orderId.slice(-8).toUpperCase()})`;

  const loyaltyLine =
    params.loyaltyPointsAwarded && params.loyaltyPointsAwarded > 0
      ? `<p style="color:#BF953F;margin:16px 0 0;">Loyalty points earned: +${params.loyaltyPointsAwarded}</p>`
      : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;color:#E8E8E8;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#BF953F;margin:0 0 8px;">${SITE_NAME}</p>
    <h1 style="font-size:22px;font-weight:300;letter-spacing:0.08em;text-transform:uppercase;color:#F5F5F5;margin:0 0 24px;">Requisition Authorized</h1>
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">Payment received. Your research compounds are entering fulfillment.</p>
    <div style="margin:32px 0;padding:24px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">
      <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">Order ID</p>
      <p style="margin:0;font-family:monospace;font-size:14px;color:#E8E8E8;">${params.orderId}</p>
      <p style="margin:24px 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">Total Paid</p>
      <p style="margin:0;font-size:18px;color:#BF953F;">$${params.total.toFixed(2)}</p>
      ${loyaltyLine}
    </div>
    <a href="${accountUrl}" style="display:inline-block;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#BF953F;text-decoration:none;border-bottom:1px solid rgba(191,149,63,0.4);padding-bottom:2px;">Open Client Portal</a>
    <p style="margin:32px 0 0;font-size:10px;color:#525252;letter-spacing:0.1em;text-transform:uppercase;">Research use only · Not for human consumption</p>
  </div>
</body>
</html>`;

  const text = [
    `${SITE_NAME} — Requisition Authorized`,
    `Order ID: ${params.orderId}`,
    `Total: $${params.total.toFixed(2)}`,
    params.loyaltyPointsAwarded ? `Loyalty points: +${params.loyaltyPointsAwarded}` : '',
    `Client Portal: ${accountUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}
