import { z } from 'zod';

export const clinicMessageSenderRoleSchema = z.enum(['patient', 'provider']);

export type ClinicMessageSenderRole = z.infer<typeof clinicMessageSenderRoleSchema>;

export const clinicLabResultStatusSchema = z.enum(['pending', 'reviewed']);

export type ClinicLabResultStatus = z.infer<typeof clinicLabResultStatusSchema>;

export type ClinicMessage = {
  id: string;
  patientId: string;
  providerUid: string | null;
  senderRole: ClinicMessageSenderRole;
  content: string;
  readAt: string | null;
  createdAt: string;
};

export type ClinicLabResult = {
  id: string;
  patientId: string;
  title: string;
  status: ClinicLabResultStatus;
  fileUrl: string;
  providerNotes: string | null;
  createdAt: string;
};

export const sendPatientMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export type SendPatientMessageInput = z.infer<typeof sendPatientMessageSchema>;

export const sendProviderMessageSchema = z.object({
  patientId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
});

export type SendProviderMessageInput = z.infer<typeof sendProviderMessageSchema>;

export const uploadLabResultSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  providerNotes: z.string().trim().max(2000).optional().nullable(),
  status: clinicLabResultStatusSchema.default('pending'),
});

export type UploadLabResultInput = z.infer<typeof uploadLabResultSchema>;

export type PatientCareDashboardData = {
  messages: ClinicMessage[];
  labs: ClinicLabResult[];
};
