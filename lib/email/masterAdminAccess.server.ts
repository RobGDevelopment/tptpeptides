import 'server-only';

import { SITE_NAME } from '../brand';
import { getSiteUrl } from '../site';

export function buildMasterAdminAccessEmail(params: {
  email: string;
  backOfficeUrl: string;
  signInUrl: string;
  passwordResetUrl?: string;
}): { subject: string; html: string; text: string } {
  const subject = `${SITE_NAME} — Back-Office access (Super Admin)`;

  const resetBlock = params.passwordResetUrl
    ? `<p style="margin:24px 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">Set your password</p>
       <a href="${params.passwordResetUrl}" style="display:inline-block;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#BF953F;text-decoration:none;border-bottom:1px solid rgba(191,149,63,0.4);padding-bottom:2px;">Create or reset password</a>
       <p style="margin:12px 0 0;font-size:11px;color:#525252;line-height:1.5;">Use this link once, then sign in with <strong style="color:#A3A3A3;">${params.email}</strong>.</p>`
    : `<p style="margin:24px 0 0;font-size:13px;color:#A3A3A3;line-height:1.6;">Sign in with your existing password at the link below.</p>`;

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;color:#E8E8E8;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#BF953F;margin:0 0 8px;">${SITE_NAME}</p>
    <h1 style="font-size:22px;font-weight:300;letter-spacing:0.08em;text-transform:uppercase;color:#F5F5F5;margin:0 0 24px;">Back-Office Access</h1>
    <p style="font-size:14px;line-height:1.6;color:#A3A3A3;font-weight:300;">You have been provisioned as a <strong style="color:#BF953F;">Super Admin</strong> with full back-office controls — catalog, orders, CMS, modules, and user management.</p>
    ${resetBlock}
    <div style="margin:32px 0;padding:24px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">
      <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">Back-Office (install / bookmark)</p>
      <a href="${params.backOfficeUrl}" style="display:block;margin:0 0 16px;font-size:14px;color:#BF953F;text-decoration:none;">${params.backOfficeUrl}</a>
      <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">Client sign-in</p>
      <a href="${params.signInUrl}" style="display:block;margin:0;font-size:14px;color:#E8E8E8;text-decoration:none;">${params.signInUrl}</a>
    </div>
    <p style="margin:0;font-size:11px;color:#525252;line-height:1.6;">After signing in, open Back-Office from the nav or go directly to the admin URL. Enable feature modules at <span style="color:#737373;">/admin/modules</span> when ready.</p>
    <p style="margin:32px 0 0;font-size:10px;color:#525252;letter-spacing:0.1em;text-transform:uppercase;">Research use only · Authorized personnel</p>
  </div>
</body>
</html>`;

  const text = [
    `${SITE_NAME} — Back-Office Super Admin Access`,
    '',
    `You have full back-office controls.`,
    params.passwordResetUrl ? `Set password: ${params.passwordResetUrl}` : '',
    `Back-Office: ${params.backOfficeUrl}`,
    `Sign in: ${params.signInUrl}`,
    '',
    'Enable modules at /admin/modules after first login.',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

export function masterAdminUrls(siteUrl?: string) {
  const base = (siteUrl ?? getSiteUrl()).replace(/\/$/, '');
  return {
    backOfficeUrl: `${base}/admin`,
    signInUrl: `${base}/account`,
  };
}
