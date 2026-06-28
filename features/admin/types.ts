export type OrderStatus =
  | 'pending_payment'
  | 'pending_invoice'
  | 'paid'
  | 'processing'
  | 'fulfilled'
  | 'cancelled';

export interface AdminProductVariant {
  id: string;
  tag: string;
  price: number;
  baseCost: number | null;
  stock: number;
  active: boolean;
  reorderThreshold: number;
  storefrontBadge: 'none' | 'new_batch';
  activeFrom: string | null;
  activeUntil: string | null;
}

export interface AdminProductGroup {
  catalogId: string;
  name: string;
  category: string;
  desc: string;
  researchAreas: string[];
  variants: AdminProductVariant[];
}

export interface AdminOrderRow {
  id: string;
  userId: string | null;
  guestEmail?: string | null;
  total: number;
  status: OrderStatus;
  items: { name: string; quantity: number }[];
  createdAt?: Date | null;
  trackingNumber?: string | null;
  carrier?: string | null;
}

export interface LowStockVariant {
  id: string;
  catalogId: string;
  name: string;
  tag: string;
  stock: number;
  reorderThreshold: number;
  baseCost: number | null;
  price: number;
}

export interface AuditLogRow {
  id: string;
  type: string;
  action?: string;
  userId: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date | null;
  userAgent?: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  pending_invoice: 'Pending Invoice',
  paid: 'Paid',
  processing: 'Processing',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending_payment',
  'pending_invoice',
  'paid',
  'processing',
  'fulfilled',
];
