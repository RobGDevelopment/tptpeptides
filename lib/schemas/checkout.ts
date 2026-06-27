import { z } from 'zod';

export const checkoutLineItemSchema = z.object({
  id: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

export const checkoutRequestSchema = z.object({
  items: z.array(checkoutLineItemSchema).min(1),
  email: z.string().email().optional(),
  researchUseAcknowledged: z.literal(true, {
    message: 'You must confirm research-use-only terms',
  }),
  poNumber: z.string().max(64).optional(),
  promoCode: z.string().max(32).optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const checkoutFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  researchUseAcknowledged: z.boolean().refine((value) => value === true, {
    message: 'You must confirm research-use-only terms',
  }),
  poNumber: z.string().max(64).optional(),
  promoCode: z.string().max(32).optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const guestOrderLookupSchema = z.object({
  email: z.string().email(),
  orderId: z.string().min(6),
});

export type GuestOrderLookup = z.infer<typeof guestOrderLookupSchema>;
