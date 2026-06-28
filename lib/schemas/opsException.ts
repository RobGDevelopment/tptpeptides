import { z } from 'zod';

export const opsExceptionTypeSchema = z.enum([
  'auto_po_failed',
  'auto_label_failed',
  'tracking_webhook_failed',
  'lexical_quarantine',
]);

export const opsExceptionStatusSchema = z.enum(['open', 'resolved', 'ignored']);

export const opsExceptionDocSchema = z.object({
  type: opsExceptionTypeSchema,
  status: opsExceptionStatusSchema.default('open'),
  orderId: z.string().optional(),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.string()).optional(),
  tenantId: z.string().optional(),
  createdAt: z.string(),
  resolvedAt: z.string().optional(),
});

export type OpsExceptionDoc = z.infer<typeof opsExceptionDocSchema>;
export type OpsExceptionType = z.infer<typeof opsExceptionTypeSchema>;
export type OpsExceptionStatus = z.infer<typeof opsExceptionStatusSchema>;

export const satelliteProvisionRequestSchema = z.object({
  domain: z.string().min(3),
  tenantSlug: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  primaryProvider: z.enum(['seamlesschex', 'payram']).optional(),
  theme: z
    .object({
      primaryColor: z
        .string()
        .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)
        .optional(),
      accentColor: z
        .string()
        .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)
        .optional(),
      logoUrl: z.string().url().optional(),
      fontFamily: z.string().min(1).max(200).optional(),
    })
    .optional(),
  content: z
    .object({
      heroHeadline: z.string().min(1).max(200).optional(),
      supportEmail: z.string().email().optional(),
      termsUrl: z
        .string()
        .min(1)
        .max(500)
        .refine(
          (value) => value.startsWith('/') || /^https?:\/\/.+/i.test(value),
          'Terms URL must be a path or absolute http(s) URL'
        )
        .optional(),
    })
    .optional(),
});

export type SatelliteProvisionRequest = z.infer<typeof satelliteProvisionRequestSchema>;
