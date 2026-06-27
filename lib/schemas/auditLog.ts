import { z } from 'zod';

export const auditLogDocSchema = z.object({
  type: z.enum(['age_verification', 'order_created', 'admin_action']),
  userId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AuditLogDoc = z.infer<typeof auditLogDocSchema>;
