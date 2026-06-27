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

export const paymentMethodSchema = z.enum(['stripe_checkout']);

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
  stripeSessionId: z.string().optional(),
  stripePaymentIntentId: z.string().nullable().optional(),
  poNumber: z.string().nullable().optional(),
  ruoAttestationTimestamp: z.string().optional(),
  ipAddress: z.string().optional(),
  financialLockedAt: z.string().optional(),
  status: z
    .enum(['pending_payment', 'paid', 'processing', 'fulfilled', 'cancelled'])
    .default('pending_payment'),
  loyaltyPointsAwarded: z.number().int().min(0).optional(),
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
  'ruoAttestationTimestamp',
  'ipAddress',
  'financialLockedAt',
] as const;
