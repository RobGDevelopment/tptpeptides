import { z } from 'zod';

export const siteSettingsSchema = z.object({
  heroTitle: z.string().min(1).max(120),
  heroBody: z.string().min(1).max(500),
  primaryCtaLabel: z.string().min(1).max(80),
  primaryCtaHref: z.string().min(1).max(200),
  secondaryCtaLabel: z.string().min(1).max(80),
  secondaryCtaHref: z.string().min(1).max(200),
  footerTagline: z.string().min(1).max(200),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const homepageMerchandisingSchema = z.object({
  featuredTitle: z.string().min(1).max(120),
  featuredSubtitle: z.string().min(1).max(400),
  featuredSlugs: z.array(z.string().min(1)).max(24).default([]),
  featuredLimit: z.number().int().min(1).max(24).default(9),
});

export type HomepageMerchandising = z.infer<typeof homepageMerchandisingSchema>;

export const categoryMerchandisingItemSchema = z.object({
  catalogCategory: z.string().min(1),
  displayName: z.string().min(1).max(120),
  sortOrder: z.number().int().min(0),
  visible: z.boolean().default(true),
});

export const categoryMerchandisingSchema = z.object({
  categories: z.array(categoryMerchandisingItemSchema),
});

export type CategoryMerchandising = z.infer<typeof categoryMerchandisingSchema>;

export const researchArticleCmsSchema = z.object({
  slug: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(400),
  publishedAt: z.string().min(1).max(32),
  category: z.string().min(1).max(80),
  body: z.array(z.string().min(1)).min(1).max(20),
  published: z.boolean().default(true),
});

export type ResearchArticleCms = z.infer<typeof researchArticleCmsSchema>;

export const protocolTemplateCmsSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  compounds: z.array(z.string().min(1)).min(1).max(12),
  focus: z.string().min(1).max(500),
  href: z.string().min(1).max(200),
  sortOrder: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});

export type ProtocolTemplateCms = z.infer<typeof protocolTemplateCmsSchema>;
