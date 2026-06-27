import { SITE_NAME } from '../../brand';

/** Shared TPT Peptides email shell — void background, gold accent, static beam divider. */
export function wrapInviteEmail(params: {
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryHtml?: string;
  footerNote?: string;
}): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;color:#E8E8E8;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#BF953F;margin:0 0 8px;font-weight:500;">${SITE_NAME}</p>
    <div style="height:1px;margin:0 0 24px;background:linear-gradient(90deg,transparent,rgba(191,149,63,0.45) 20%,rgba(191,149,63,0.65) 50%,rgba(191,149,63,0.45) 80%,transparent);"></div>
    <h1 style="font-size:22px;font-weight:300;letter-spacing:0.08em;text-transform:uppercase;color:#F5F5F5;margin:0 0 24px;">${params.headline}</h1>
    ${params.bodyHtml}
    <p style="margin:32px 0 16px;">
      <a href="${params.ctaUrl}" style="display:inline-block;padding:14px 28px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#0A0A0A;background:linear-gradient(105deg,#9a7b3c,#d4bc82,#9a7b3c);text-decoration:none;font-weight:500;">${params.ctaLabel}</a>
    </p>
    ${params.secondaryHtml ?? ''}
    <p style="margin:32px 0 0;font-size:10px;color:#525252;letter-spacing:0.1em;text-transform:uppercase;line-height:1.6;">${params.footerNote ?? 'Research use only · Not for human or veterinary consumption'}</p>
  </div>
</body>
</html>`;
}

export function inviteLinkBlock(label: string, url: string): string {
  return `<div style="margin:24px 0;padding:20px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">
    <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">${label}</p>
    <a href="${url}" style="font-size:13px;color:#BF953F;text-decoration:none;word-break:break-all;">${url}</a>
  </div>`;
}

export function inviteStepsBlock(title: string, steps: string[]): string {
  const items = steps
    .map(
      (step) =>
        `<li style="margin:0 0 10px;font-size:13px;line-height:1.65;color:#A3A3A3;font-weight:300;">${step}</li>`
    )
    .join('');

  return `<div style="margin:24px 0;padding:20px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">
    <p style="margin:0 0 14px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">${title}</p>
    <ol style="margin:0;padding-left:20px;">${items}</ol>
  </div>`;
}

export function inviteStagingNotice(siteBaseUrl: string): string {
  let host = siteBaseUrl;
  try {
    host = new URL(siteBaseUrl).host;
  } catch {
    /* keep raw string */
  }

  return `<p style="margin:20px 0 0;padding:14px 16px;border:1px solid rgba(191,149,63,0.2);background:rgba(191,149,63,0.06);font-size:12px;line-height:1.65;color:#A3A3A3;">
    <strong style="color:#BF953F;">Live preview site:</strong> Use <strong style="color:#E8E8E8;">${host}</strong> only.
  </p>`;
}
