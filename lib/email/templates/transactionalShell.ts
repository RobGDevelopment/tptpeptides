import { SITE_NAME } from '../../brand';

export function wrapTransactionalEmail(params: {
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footerNote?: string;
}): string {
  const ctaBlock = params.cta
    ? `<a href="${params.cta.href}" style="display:inline-block;margin-top:28px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#BF953F;text-decoration:none;border-bottom:1px solid rgba(191,149,63,0.4);padding-bottom:2px;">${params.cta.label}</a>`
    : '';

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;color:#E8E8E8;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#BF953F;margin:0 0 8px;">${params.eyebrow ?? SITE_NAME}</p>
    <h1 style="font-size:22px;font-weight:300;letter-spacing:0.08em;text-transform:uppercase;color:#F5F5F5;margin:0 0 24px;">${params.title}</h1>
    ${params.bodyHtml}
    ${ctaBlock}
    <p style="margin:32px 0 0;font-size:10px;color:#525252;letter-spacing:0.1em;text-transform:uppercase;">${params.footerNote ?? 'Research use only · Not for human consumption'}</p>
  </div>
</body>
</html>`;
}
