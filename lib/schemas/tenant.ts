import { z } from 'zod';

export const tenantLaneSchema = z.enum(['b2b', 'b2c', 'telehealth']);

export type TenantLane = z.infer<typeof tenantLaneSchema>;

export const tenantPaymentProviderSchema = z.enum([
  'stripe',
  'authorizenet',
  'nmi',
  'seamlesschex',
  'payram',
]);

export type TenantPaymentProvider = z.infer<typeof tenantPaymentProviderSchema>;

export const tenantPaymentRailSchema = z.enum(['b2b_card', 'b2c_ach', 'b2c_crypto']);

export const tenantPaymentConfigSchema = z.object({
  primaryProvider: tenantPaymentProviderSchema.optional(),
  useStripeUntilCutover: z.boolean().default(true),
  rail: tenantPaymentRailSchema.optional(),
});

export type TenantPaymentConfig = z.infer<typeof tenantPaymentConfigSchema>;

export const tenantThemeSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, 'Primary must be a hex color (#RGB or #RRGGBB)')
    .optional(),
  accentColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, 'Accent must be a hex color (#RGB or #RRGGBB)')
    .optional(),
  logoUrl: z.string().url().optional(),
  fontFamily: z.string().min(1).max(200).optional(),
});

export type TenantTheme = z.infer<typeof tenantThemeSchema>;

export const tenantContentSchema = z.object({
  heroHeadline: z.string().min(1).max(200).optional(),
  heroBody: z.string().min(1).max(500).optional(),
  primaryCtaLabel: z.string().min(1).max(80).optional(),
  primaryCtaHref: z.string().min(1).max(200).optional(),
  secondaryCtaLabel: z.string().min(1).max(80).optional(),
  secondaryCtaHref: z.string().min(1).max(200).optional(),
  footerTagline: z.string().min(1).max(200).optional(),
  wordmark: z.string().min(1).max(80).optional(),
  heroImageUrl: z.string().url().optional(),
  heroImageAlt: z.string().max(120).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  supportEmail: z.string().email().optional(),
  termsUrl: z
    .string()
    .min(1)
    .max(500)
    .refine(
      (value) => value.startsWith('/') || /^https?:\/\/.+/i.test(value),
      'Terms URL must be a path (/terms) or absolute http(s) URL'
    )
    .optional(),
});

export type TenantContent = z.infer<typeof tenantContentSchema>;

export const tenantConfigSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  lane: tenantLaneSchema.default('b2b'),
  domains: z.array(z.string().min(1)).default([]),
  supportEmail: z.string().email().optional(),
  payment: tenantPaymentConfigSchema.optional(),
  theme: tenantThemeSchema.optional(),
  content: tenantContentSchema.optional(),
  active: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type TenantConfig = z.infer<typeof tenantConfigSchema>;
