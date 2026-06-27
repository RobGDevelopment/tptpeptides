import 'server-only';

function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatMoney(amount: number | undefined | null): string {
  if (amount == null || Number.isNaN(amount)) return '0.00';
  return amount.toFixed(2);
}

export interface ExportOrderRow {
  id: string;
  createdAt: string;
  status: string;
  guestEmail?: string | null;
  userId?: string | null;
  poNumber?: string | null;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discountTotal?: number;
  total: number;
  paymentMethod?: string;
  stripePaymentIntentId?: string | null;
  stripeSessionId?: string | null;
  ruoAttestationTimestamp?: string;
  ipAddress?: string;
  email?: string;
}

/** QuickBooks-friendly CSV — one row per order. */
export function buildQuickBooksOrdersCsv(orders: ExportOrderRow[]): string {
  const headers = [
    'Date',
    'Order ID',
    'Customer Email',
    'User ID',
    'PO Number',
    'Subtotal',
    'Tax',
    'Shipping',
    'Discount',
    'Total',
    'Payment Method',
    'Stripe Payment Intent',
    'Stripe Session ID',
    'Status',
    'RUO Attestation',
    'IP Address',
  ];

  const lines = [headers.join(',')];

  for (const order of orders) {
    lines.push(
      [
        escapeCsvField(order.createdAt),
        escapeCsvField(order.id),
        escapeCsvField(order.email ?? order.guestEmail ?? ''),
        escapeCsvField(order.userId ?? ''),
        escapeCsvField(order.poNumber ?? ''),
        formatMoney(order.subtotal ?? order.total),
        formatMoney(order.tax ?? 0),
        formatMoney(order.shipping ?? 0),
        formatMoney(order.discountTotal ?? 0),
        formatMoney(order.total),
        escapeCsvField(order.paymentMethod ?? 'stripe_checkout'),
        escapeCsvField(order.stripePaymentIntentId ?? ''),
        escapeCsvField(order.stripeSessionId ?? ''),
        escapeCsvField(order.status),
        escapeCsvField(order.ruoAttestationTimestamp ?? ''),
        escapeCsvField(order.ipAddress ?? ''),
      ].join(',')
    );
  }

  return lines.join('\r\n');
}

export function isCompletedOrderStatus(status: string): boolean {
  return status === 'paid' || status === 'processing' || status === 'fulfilled';
}

export function mapFirestoreOrderToExport(
  id: string,
  data: Record<string, unknown>
): ExportOrderRow | null {
  const status = String(data.status ?? '');
  if (!isCompletedOrderStatus(status)) return null;

  const createdAtRaw = data.createdAt as { toDate?: () => Date } | undefined;
  const createdAt = createdAtRaw?.toDate?.()?.toISOString?.() ?? '';

  return {
    id,
    createdAt,
    status,
    guestEmail: (data.guestEmail as string | null) ?? null,
    userId: (data.userId as string | null) ?? null,
    poNumber: (data.poNumber as string | null) ?? null,
    subtotal: Number(data.subtotal ?? data.total ?? 0),
    tax: Number(data.tax ?? 0),
    shipping: Number(data.shipping ?? data.shippingEstimate ?? 0),
    discountTotal: Number(data.discountTotal ?? 0),
    total: Number(data.total ?? 0),
    paymentMethod: String(data.paymentMethod ?? 'stripe_checkout'),
    stripePaymentIntentId: (data.stripePaymentIntentId as string | null) ?? null,
    stripeSessionId: (data.stripeSessionId as string | null) ?? null,
    ruoAttestationTimestamp: data.ruoAttestationTimestamp as string | undefined,
    ipAddress: data.ipAddress as string | undefined,
  };
}
