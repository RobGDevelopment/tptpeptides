import { z } from 'zod';
import {
  attestationSignatureMatches,
  B2B_ATTESTATION_PHRASE,
  researchIntentSchema,
} from './attestation';

export const checkoutLineItemSchema = z.object({
  id: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

export const checkoutRequestSchema = z.object({
  items: z.array(checkoutLineItemSchema).min(1),
  email: z.string().email().optional(),
  researchUseAcknowledged: z.literal(true).optional(),
  attestationLogId: z.string().min(1).optional(),
  poNumber: z.string().max(64).optional(),
  promoCode: z.string().max(32).optional(),
  paymentMethod: z.enum(['card', 'net_terms']),
  shippingState: z.string().length(2).optional(),
  shippingPostalCode: z.string().min(3).max(10).optional(),
  pointsToRedeem: z.number().int().nonnegative().optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const checkoutFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  researchUseAcknowledged: z.boolean().refine((value) => value === true, {
    message: 'You must confirm research-use-only terms',
  }),
  poNumber: z.string().max(64).optional(),
  promoCode: z.string().max(32).optional(),
  paymentMethod: z.enum(['card', 'net_terms']),
  shippingState: z.string().length(2).optional(),
  shippingPostalCode: z.string().min(3).max(10).optional(),
  pointsToRedeem: z.number().int().nonnegative().optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const checkoutTypedAttestationFormSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    researchIntent: z.string().min(1, 'Select your research intent').pipe(researchIntentSchema),
    typedSignature: z.string().min(1, 'Type the attestation phrase exactly as shown'),
    poNumber: z.string().max(64).optional(),
    promoCode: z.string().max(32).optional(),
    paymentMethod: z.enum(['card', 'net_terms']),
    shippingState: z.string().length(2).optional(),
    shippingPostalCode: z.string().min(3).max(10).optional(),
    pointsToRedeem: z.number().int().nonnegative().optional(),
  })
  .superRefine((values, ctx) => {
    if (!attestationSignatureMatches(B2B_ATTESTATION_PHRASE, values.typedSignature)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Typed signature must match the attestation phrase exactly',
        path: ['typedSignature'],
      });
    }
  });

export type CheckoutTypedAttestationFormValues = z.infer<
  typeof checkoutTypedAttestationFormSchema
>;

export const guestOrderLookupSchema = z.object({
  email: z.string().email(),
  orderId: z.string().min(6),
});

export type GuestOrderLookup = z.infer<typeof guestOrderLookupSchema>;
