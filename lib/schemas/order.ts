import { z } from 'zod';

export const cartItemSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  name: z.string(),
  tag: z.string(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  desc: z.string(),
  purity: z.string(),
  quantity: z.number().int().positive(),
});

export const paymentMethodSchema = z.enum(['stripe_checkout', 'stripe_invoice']);

export const orderStatusSchema = z.enum([
  'pending_payment',
  'pending_invoice',
  'paid',
  'processing',
  'fulfilled',
  'cancelled',
]);

export const orderDocSchema = z.object({
  userId: z.string().nullable(),
  guestEmail: z.string().email().nullable().optional(),
  items: z.array(cartItemSchema).min(1),
  /** Grand total charged (subtotal + shipping + tax - discounts) */
  total: z.number().positive(),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  shipping: z.number().min(0).default(0),
  discountTotal: z.number().min(0).default(0),
  paymentMethod: paymentMethodSchema.default('stripe_checkout'),
  stripeSessionId: z.string().nullable().optional(),
  stripeInvoiceId: z.string().nullable().optional(),
  stripePaymentIntentId: z.string().nullable().optional(),
  paymentProviderId: z.string().optional(),
  providerTransactionId: z.string().optional(),
  poNumber: z.string().nullable().optional(),
  quoteId: z.string().nullable().optional(),
  ruoAttestationTimestamp: z.string().optional(),
  attestationLogId: z.string().optional(),
  ipAddress: z.string().optional(),
  tenantId: z.string().optional(),
  financialLockedAt: z.string().optional(),
  paidAt: z.string().optional(),
  status: orderStatusSchema.default('pending_payment'),
  loyaltyPointsAwarded: z.number().int().min(0).optional(),
  pointsRedeemed: z.number().int().min(0).optional(),
  loyaltyDiscount: z.number().min(0).optional(),
  journalEntryId: z.string().optional(),
});

export type OrderDoc = z.infer<typeof orderDocSchema>;

/** Fields that must not change after payment is captured. */
export const IMMUTABLE_FINANCIAL_ORDER_FIELDS = [
  'subtotal',
  'tax',
  'shipping',
  'discountTotal',
  'total',
  'paymentMethod',
  'stripePaymentIntentId',
  'stripeInvoiceId',
  'pointsRedeemed',
  'loyaltyDiscount',
  'quoteId',
  'ruoAttestationTimestamp',
  'attestationLogId',
  'ipAddress',
  'financialLockedAt',
  'journalEntryId',
] as const;
