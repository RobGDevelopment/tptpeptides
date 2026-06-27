import { z } from 'zod';

export const labTypeSchema = z.enum([
  'academic_research',
  'biotech_pharma',
  'contract_research_organization',
  'independent_laboratory',
  'other',
]);

export type LabType = z.infer<typeof labTypeSchema>;

export const verificationStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const institutionVerificationSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  institutionName: z.string().min(2),
  einTaxId: z.string().min(4).max(32),
  labType: labTypeSchema,
  documentStoragePath: z.string(),
  documentFileName: z.string(),
  status: verificationStatusSchema,
  submittedAt: z.string(),
  reviewedAt: z.string().optional(),
  reviewedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export type InstitutionVerification = z.infer<typeof institutionVerificationSchema>;

export const verificationSubmitSchema = z.object({
  institutionName: z.string().min(2, 'Institution name is required'),
  einTaxId: z
    .string()
    .min(4, 'EIN / Tax ID is required')
    .max(32)
    .regex(/^[0-9A-Za-z-]+$/, 'Enter a valid EIN or Tax ID'),
  labType: labTypeSchema,
});

export const LAB_TYPE_LABELS: Record<LabType, string> = {
  academic_research: 'Academic Research',
  biotech_pharma: 'Biotech / Pharma',
  contract_research_organization: 'Contract Research (CRO)',
  independent_laboratory: 'Independent Laboratory',
  other: 'Other Qualified Lab',
};
