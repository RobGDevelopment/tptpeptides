import { z } from 'zod';

export const quoteStatusSchema = z.enum(['draft', 'sent', 'accepted', 'expired', 'cancelled']);

export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const quoteLineItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  tag: z.string(),
  quantity: z.number().int().positive().max(999),
  unitPrice: z.number().positive(),
});

export type QuoteLineItem = z.infer<typeof quoteLineItemSchema>;

export const quoteDocumentSchema = z.object({
  quoteNumber: z.string().min(1),
  status: quoteStatusSchema,
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  institutionName: z.string().optional(),
  customerUserId: z.string().nullable().optional(),
  lineItems: z.array(quoteLineItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().positive(),
  validUntil: z.string(),
  notes: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  sentAt: z.string().nullable().optional(),
});

export type QuoteDocument = z.infer<typeof quoteDocumentSchema>;

export const adminQuoteCreateSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  institutionName: z.string().optional(),
  customerUserId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().max(999),
      })
    )
    .min(1),
  notes: z.string().max(2000).optional(),
  validDays: z.number().int().min(1).max(90).default(30),
});

export type AdminQuoteCreate = z.infer<typeof adminQuoteCreateSchema>;

export const adminQuotePatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('send') }),
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('expire') }),
]);

export type AdminQuotePatch = z.infer<typeof adminQuotePatchSchema>;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  expired: 'Expired',
  cancelled: 'Cancelled',
};
