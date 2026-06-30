import { z } from 'zod';

const optionalMediaUrl = z
  .string()
  .max(500)
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  })
  .refine(
    (value) => !value || value.startsWith('/') || /^https?:\/\/.+/i.test(value),
    { message: 'Use a site path (/corp/...) or full https:// URL' }
  );

export const heroMediaTypeSchema = z.enum(['image', 'video']);
export type HeroMediaType = z.infer<typeof heroMediaTypeSchema>;

export const heroMediaAspectRatioSchema = z.enum(['auto', '16:9', '9:16', '4:5', '3:4', '1:1']);
export type HeroMediaAspectRatio = z.infer<typeof heroMediaAspectRatioSchema>;

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
  heroImageUrl: optionalMediaUrl,
  heroImageAlt: z.string().max(120).optional(),
  heroMediaType: heroMediaTypeSchema.default('image'),
  heroMediaAspectRatio: heroMediaAspectRatioSchema.default('auto'),
  heroMediaWidth: z.number().int().positive().max(20000).optional(),
  heroMediaHeight: z.number().int().positive().max(20000).optional(),
  heroVideoPosterUrl: optionalMediaUrl,
  heroVideoLoop: z.boolean().default(true),
  heroVideoMuted: z.boolean().default(true),
  /** Skip glitch frames at loop seam (seconds). */
  heroVideoLoopTrimStart: z.number().min(0).max(30).default(0),
  heroVideoLoopTrimEnd: z.number().min(0).max(30).default(0),
  logoUrl: optionalMediaUrl,
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
