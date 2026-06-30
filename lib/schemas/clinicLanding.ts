import { z } from 'zod';

const optionalUrl = z
  .string()
  .max(500)
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  })
  .refine((value) => !value || /^https?:\/\/.+/i.test(value), {
    message: 'Use a full https:// image URL',
  });

const optionalHex = z
  .string()
  .max(20)
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  })
  .refine((value) => !value || /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(value), {
    message: 'Use a hex color such as #2D6A6A',
  });

export const clinicLandingContentSchema = z.object({
  heroHeadline: z.string().min(1, 'Headline is required').max(200),
  heroBody: z.string().min(1, 'Body copy is required').max(500),
  primaryCtaLabel: z.string().min(1).max(80),
  primaryCtaHref: z
    .string()
    .min(1)
    .max(200)
    .refine((value) => value.startsWith('/'), 'Use a site path such as /intake'),
  secondaryCtaLabel: z.string().min(1).max(80),
  secondaryCtaHref: z
    .string()
    .min(1)
    .max(200)
    .refine((value) => value.startsWith('/'), 'Use a site path such as /dashboard'),
  footerTagline: z.string().min(1).max(200),
  wordmark: z.string().min(1).max(80),
  heroImageUrl: optionalUrl,
  heroImageAlt: z.string().max(120).optional(),
  logoUrl: optionalUrl,
  navBrandName: z.string().max(80).optional(),
  heroImagePosition: z.enum(['left', 'right']).default('right'),
  primaryColor: optionalHex,
  accentColor: optionalHex,
  backgroundColor: optionalHex,
});

export type ClinicLandingContent = z.infer<typeof clinicLandingContentSchema>;

export function mergeClinicLandingContent(
  partial: Partial<ClinicLandingContent> | null | undefined,
  defaults: ClinicLandingContent
): ClinicLandingContent {
  if (!partial) return defaults;
  const parsed = clinicLandingContentSchema.partial().safeParse(partial);
  if (!parsed.success) return defaults;
  return clinicLandingContentSchema.parse({ ...defaults, ...parsed.data });
}
