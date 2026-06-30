import { z } from 'zod';
import { clinicShippingAddressSchema } from './clinicIntake';

export type PatientPortalShippingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

export type PatientPortalProfile = {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  shippingAddress: PatientPortalShippingAddress | null;
};

export type PatientPortalIntake = {
  id: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
};

export type PatientPortalPrescription = {
  id: string;
  medicationName: string;
  dosageInstructions: string;
  status: string;
  createdAt: string;
};

export type PatientDashboardData = {
  profile: PatientPortalProfile;
  latestIntake: PatientPortalIntake | null;
  prescriptions: PatientPortalPrescription[];
};

export const profileUpdateSchema = z.object({
  phone: z
    .string()
    .min(7, 'Phone number is required')
    .max(20)
    .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Enter a valid phone number'),
  shippingAddress: clinicShippingAddressSchema,
});

export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;
