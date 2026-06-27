import { z } from 'zod';
import { institutionTierSchema } from './user';

export const priceListDocSchema = z.object({
  tier: institutionTierSchema,
  /** Fraction off catalog price — 0.08 = 8% discount */
  discountPercent: z.number().min(0).max(0.5),
  /** Optional absolute unit price overrides keyed by product document id */
  productOverrides: z.record(z.string(), z.number().positive()).default({}),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type PriceListDoc = z.infer<typeof priceListDocSchema>;

export const priceListPatchSchema = z.object({
  tier: institutionTierSchema,
  discountPercent: z.number().min(0).max(0.5).optional(),
  productOverrides: z.record(z.string(), z.number().positive()).optional(),
});

export type PriceListPatch = z.infer<typeof priceListPatchSchema>;
