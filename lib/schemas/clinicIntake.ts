import { z } from 'zod';

export const CLINIC_CONSENT_VERSION = 'openloop-telehealth-v1.0';

export const clinicShippingAddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required').max(120),
  line2: z.string().max(120).optional(),
  city: z.string().min(1, 'City is required').max(80),
  state: z
    .string()
    .length(2, 'Use 2-letter state code')
    .regex(/^[A-Za-z]{2}$/, 'Use 2-letter state code'),
  postal_code: z.string().min(3, 'Postal code is required').max(10),
  country: z.string().length(2).default('US'),
});

export type ClinicShippingAddress = z.infer<typeof clinicShippingAddressSchema>;

export const clinicDemographicsSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00`);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }, 'Date of birth must be in the past'),
  phone: z
    .string()
    .min(7, 'Phone number is required')
    .max(20)
    .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Enter a valid phone number'),
  shippingAddress: clinicShippingAddressSchema,
});

export type ClinicDemographics = z.infer<typeof clinicDemographicsSchema>;

export const clinicClinicalQuestionnaireSchema = z.object({
  medicalHistory: z.string().min(1, 'Medical history is required').max(4000),
  allergies: z.string().min(1, 'List allergies or enter "None"').max(2000),
  currentMedications: z.string().min(1, 'List medications or enter "None"').max(2000),
  additionalNotes: z.string().max(2000).optional(),
});

export type ClinicClinicalQuestionnaire = z.infer<typeof clinicClinicalQuestionnaireSchema>;

export const clinicConsentSchema = z.object({
  telehealthConsentAccepted: z.literal(true, {
    message: 'You must accept the informed consent to continue',
  }),
});

export type ClinicConsent = z.infer<typeof clinicConsentSchema>;

export const clinicIntakeSubmissionSchema = z.object({
  demographics: clinicDemographicsSchema,
  clinicalQuestionnaire: clinicClinicalQuestionnaireSchema,
  consent: clinicConsentSchema,
});

export type ClinicIntakeSubmission = z.infer<typeof clinicIntakeSubmissionSchema>;

export function toPatientProfileRow(
  userId: string,
  demographics: ClinicDemographics
): {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  shipping_address: ClinicShippingAddress;
} {
  return {
    id: userId,
    first_name: demographics.firstName.trim(),
    last_name: demographics.lastName.trim(),
    date_of_birth: demographics.dateOfBirth,
    phone: demographics.phone.trim(),
    shipping_address: demographics.shippingAddress,
  };
}

export function toClinicalQuestionnairePayload(
  questionnaire: ClinicClinicalQuestionnaire
): Record<string, string | undefined> {
  return {
    medicalHistory: questionnaire.medicalHistory.trim(),
    allergies: questionnaire.allergies.trim(),
    currentMedications: questionnaire.currentMedications.trim(),
    ...(questionnaire.additionalNotes?.trim()
      ? { additionalNotes: questionnaire.additionalNotes.trim() }
      : {}),
  };
}
