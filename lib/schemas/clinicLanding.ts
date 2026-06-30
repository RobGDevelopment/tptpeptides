import { z } from 'zod';

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
