import { z } from 'zod';

export const cartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  tag: z.string(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  desc: z.string(),
  purity: z.string(),
  quantity: z.number().int().positive(),
});

export const orderDocSchema = z.object({
  userId: z.string().nullable(),
  guestEmail: z.string().email().nullable().optional(),
  items: z.array(cartItemSchema).min(1),
  total: z.number().positive(),
  status: z
    .enum(['pending_payment', 'paid', 'processing', 'fulfilled', 'cancelled'])
    .default('pending_payment'),
  stripeSessionId: z.string().optional(),
  loyaltyPointsAwarded: z.number().int().min(0).optional(),
});

export type OrderDoc = z.infer<typeof orderDocSchema>;
