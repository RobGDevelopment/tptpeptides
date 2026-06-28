import type { QuoteDocument } from '../schemas/quote';
import { SITE_NAME } from '../brand';

export function renderQuoteHtml(quote: QuoteDocument & { id: string }): string {
  const lineRows = quote.lineItems
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.name)}<br><span style="color:#888;font-size:12px">${escapeHtml(item.tag)}</span></td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">$${item.unitPrice.toFixed(2)}</td>
        <td style="text-align:right">$${(item.unitPrice * item.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const validUntil = new Date(quote.validUntil).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(quote.quoteNumber)} — ${SITE_NAME}</title>
  <style>
    body { font-family: Georgia, serif; color: #111; max-width: 800px; margin: 40px auto; padding: 0 24px; }
    h1 { font-size: 28px; font-weight: normal; letter-spacing: 0.08em; text-transform: uppercase; }
    .meta { color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; font-size: 14px; }
    th { text-align: left; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #666; }
    .totals { margin-top: 24px; width: 280px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .totals .grand { font-size: 18px; border-top: 2px solid #111; margin-top: 8px; padding-top: 12px; }
    .footer { margin-top: 48px; font-size: 12px; color: #666; line-height: 1.6; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${SITE_NAME}</h1>
  <p class="meta">
    <strong>Quote ${escapeHtml(quote.quoteNumber)}</strong><br />
    Prepared for ${escapeHtml(quote.customerName)}${quote.institutionName ? ` · ${escapeHtml(quote.institutionName)}` : ''}<br />
    ${escapeHtml(quote.customerEmail)}<br />
    Valid until ${validUntil}
  </p>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit</th>
        <th style="text-align:right">Line</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>$${quote.subtotal.toFixed(2)}</span></div>
    <div><span>Shipping &amp; cold chain</span><span>$${quote.shipping.toFixed(2)}</span></div>
    ${quote.tax > 0 ? `<div><span>Tax</span><span>$${quote.tax.toFixed(2)}</span></div>` : ''}
    <div class="grand"><span>Total</span><span>$${quote.total.toFixed(2)}</span></div>
  </div>
  ${
    quote.notes
      ? `<p class="footer"><strong>Notes</strong><br />${escapeHtml(quote.notes)}</p>`
      : ''
  }
  <p class="footer">
    Research-use-only compounds. Not for human or veterinary consumption.<br />
    Prices subject to stock availability at time of order.
  </p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
