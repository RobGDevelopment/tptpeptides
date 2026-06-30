import { z } from 'zod';

export const PRESCRIPTION_STATUSES = ['pending_fulfillment', 'active', 'cancelled'] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

export const PRESCRIPTION_DISPATCH_STATUSES = ['pending', 'sent', 'confirmed', 'failed'] as const;
export type PrescriptionDispatchStatus = (typeof PRESCRIPTION_DISPATCH_STATUSES)[number];

export type PrescriptionRow = {
  id: string;
  patientId: string;
  intakeId: string;
  medicationName: string;
  dosageInstructions: string;
  status: PrescriptionStatus;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  dispatchStatus: PrescriptionDispatchStatus;
  externalRxId: string | null;
  dispatchedAt: string | null;
};

export type CreatePrescriptionPayload = {
  patientId: string;
  intakeId: string;
  medicationName: string;
  dosageInstructions: string;
};

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  intakeId: z.string().uuid('Invalid intake ID'),
  medicationName: z.string().min(1, 'Medication name is required').max(200),
  dosageInstructions: z.string().min(1, 'Dosage instructions are required').max(2000),
});
