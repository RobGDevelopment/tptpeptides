import { z } from 'zod';

export const productDocSchema = z.object({
  name: z.string().min(1),
  tag: z.string().min(1),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  desc: z.string(),
  purity: z.string().default('Research Grade'),
  category: z.string().optional(),
  catalogId: z.string().optional(),
  variantId: z.string().optional(),
  baseCost: z.number().nullable().optional(),
  researchAreas: z.array(z.string()).optional(),
  supplierId: z.string().optional(),
  active: z.boolean().default(true),
  reorderThreshold: z.number().int().min(0).default(20),
  storefrontBadge: z.enum(['none', 'new_batch']).optional().default('none'),
  activeFrom: z.string().datetime().nullable().optional(),
  activeUntil: z.string().datetime().nullable().optional(),
});
export type ProductDoc = z.infer<typeof productDocSchema>;

export const storefrontProductSchema = productDocSchema.extend({
  id: z.string().min(1),
});

export type StorefrontProductDoc = z.infer<typeof storefrontProductSchema>;
