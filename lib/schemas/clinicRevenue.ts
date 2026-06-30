import { z } from 'zod';

export const clinicSubscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
]);

export type ClinicSubscriptionStatus = z.infer<typeof clinicSubscriptionStatusSchema>;

export const pricingTierUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  monthlyPrice: z.number().positive().max(999_999),
  stripePriceId: z.string().max(200).optional().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export type PricingTierUpdateInput = z.infer<typeof pricingTierUpdateSchema>;

export const createPromotionSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .transform((value) => value.trim().toUpperCase())
    .refine((value) => /^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(value), {
      message: 'Use 3–32 characters: letters, numbers, hyphen, underscore.',
    }),
  discountPercentage: z.number().positive().max(100),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;

export type ClinicPricingTier = {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  stripePriceId: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type ClinicPromotion = {
  id: string;
  code: string;
  discountPercentage: number;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type RevenueMetrics = {
  activeSubscriptions: number;
  trialingSubscriptions: number;
  estimatedMrr: number;
  activePromotions: number;
  totalPromotionRedemptions: number;
};
