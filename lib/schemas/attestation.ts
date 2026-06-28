import { z } from 'zod';

/** Immutable compliance attestation record — Sprint B. */
export const attestationLogSchema = z.object({
  requiredPhrase: z.string().min(1),
  typedSignature: z.string().min(1),
  researchIntent: z.string().min(1),
  uid: z.string().nullable(),
  ipAddress: z.string().min(1),
  userAgent: z.string().min(1),
  tenantId: z.string().min(1),
  orderId: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type AttestationLog = z.infer<typeof attestationLogSchema>;

export const RESEARCH_INTENT_OPTIONS = [
  { value: 'academic_lab', label: 'Academic research laboratory' },
  { value: 'commercial_rd', label: 'Commercial R&D facility' },
  { value: 'compounding_pharmacy', label: '503A/503B compounding pharmacy' },
  { value: 'contract_research', label: 'Contract research organization (CRO)' },
  { value: 'other_institutional', label: 'Other qualified institution' },
] as const;

export const researchIntentSchema = z.enum(
  RESEARCH_INTENT_OPTIONS.map((option) => option.value) as [
    (typeof RESEARCH_INTENT_OPTIONS)[number]['value'],
    ...(typeof RESEARCH_INTENT_OPTIONS)[number]['value'][],
  ]
);

export type ResearchIntent = z.infer<typeof researchIntentSchema>;

export const createAttestationLogInputSchema = z.object({
  requiredPhrase: z.string().min(1),
  typedSignature: z.string().min(1),
  researchIntent: researchIntentSchema,
  uid: z.string().nullable(),
  ipAddress: z.string().min(1),
  userAgent: z.string().min(1),
  tenantId: z.string().min(1),
  orderId: z.string().nullable().optional(),
});

export type CreateAttestationLogInput = z.infer<typeof createAttestationLogInputSchema>;

export const attestationApiRequestSchema = z.object({
  researchIntent: researchIntentSchema,
  typedSignature: z.string().min(1, 'Typed signature is required'),
});

export type AttestationApiRequest = z.infer<typeof attestationApiRequestSchema>;

export const B2B_ATTESTATION_PHRASE =
  'I certify this purchase is for legitimate research use only and not for human consumption.';

export function attestationSignatureMatches(
  requiredPhrase: string,
  typedSignature: string
): boolean {
  return requiredPhrase.trim() === typedSignature.trim();
}
