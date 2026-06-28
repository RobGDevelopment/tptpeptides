import { z } from 'zod';

export const batchStatusSchema = z.enum(['active', 'depleted', 'quarantine']);

export type BatchStatus = z.infer<typeof batchStatusSchema>;

export const batchDocumentSchema = z.object({
  lotNumber: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  productTag: z.string(),
  quantityReceived: z.number().int().positive(),
  quantityAvailable: z.number().int().nonnegative(),
  purity: z.string().optional(),
  coaUrl: z.string().url().optional(),
  status: batchStatusSchema,
  receivedAt: z.string(),
  notes: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type BatchDocument = z.infer<typeof batchDocumentSchema>;

export const adminBatchCreateSchema = z.object({
  lotNumber: z.string().min(1).max(64),
  productId: z.string().min(1),
  quantityReceived: z.number().int().positive().max(99999),
  purity: z.string().max(32).optional(),
  coaUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
  receivedAt: z.string().optional(),
});

export type AdminBatchCreate = z.infer<typeof adminBatchCreateSchema>;

export const orderBatchAssignmentSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().min(1),
});

export type OrderBatchAssignment = z.infer<typeof orderBatchAssignmentSchema>;

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  active: 'Active',
  depleted: 'Depleted',
  quarantine: 'Quarantine',
};
