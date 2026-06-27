import { z } from 'zod';

export const catalogVariantSchema = z.object({
  id: z.string().min(1),
  dose: z.string().min(1),
  baseCost: z.number().nullable(),
  retailPrice: z.number().nullable(),
});

export const catalogEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  researchAreas: z.array(z.string()).default([]),
  variants: z.array(catalogVariantSchema).min(1),
});

export const catalogFileSchema = z.array(catalogEntrySchema);

export type CatalogVariant = z.infer<typeof catalogVariantSchema>;
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
