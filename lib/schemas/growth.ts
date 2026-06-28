import { z } from 'zod';

export const cartSnapshotItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string(),
  name: z.string(),
  tag: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
});

export type CartSnapshotItem = z.infer<typeof cartSnapshotItemSchema>;

export const cartSnapshotSchema = z.object({
  userId: z.string().nullable(),
  email: z.string().email(),
  items: z.array(cartSnapshotItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  recoveryToken: z.string().min(16),
  updatedAt: z.string(),
  emailSentAt: z.string().nullable().optional(),
  recoveredAt: z.string().nullable().optional(),
  convertedAt: z.string().nullable().optional(),
});

export type CartSnapshot = z.infer<typeof cartSnapshotSchema>;

export const cartSnapshotRequestSchema = z.object({
  items: z.array(cartSnapshotItemSchema).min(1),
  email: z.string().email().optional(),
});

export const replenishmentCandidateSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  productId: z.string(),
  productName: z.string(),
  productTag: z.string(),
  lastOrderedAt: z.string(),
  daysSinceOrder: z.number().int().nonnegative(),
  suggestedQuantity: z.number().int().positive(),
});

export type ReplenishmentCandidate = z.infer<typeof replenishmentCandidateSchema>;

export const ABANDONED_CART_IDLE_MS = 60 * 60 * 1000;
export const REPLENISHMENT_MIN_DAYS = 80;
export const REPLENISHMENT_MAX_DAYS = 100;
