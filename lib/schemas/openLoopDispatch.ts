import { z } from 'zod';

export const PRESCRIPTION_DISPATCH_STATUSES = ['pending', 'sent', 'confirmed', 'failed'] as const;
export type PrescriptionDispatchStatus = (typeof PRESCRIPTION_DISPATCH_STATUSES)[number];

export const openLoopPatientSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  phone: z.string().nullable(),
  shippingAddress: z.record(z.string(), z.unknown()).nullable(),
});

export const openLoopPrescriptionPayloadSchema = z.object({
  prescriptionId: z.string().uuid(),
  intakeId: z.string().uuid(),
  patient: openLoopPatientSchema,
  medicationName: z.string().min(1),
  dosageInstructions: z.string().min(1),
  clinicalQuestionnaire: z.record(z.string(), z.unknown()),
});

export type OpenLoopPrescriptionPayload = z.infer<typeof openLoopPrescriptionPayloadSchema>;

export type OpenLoopDispatchResult = {
  externalRxId: string;
};
