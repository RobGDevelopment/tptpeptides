import 'server-only';

import type { OpenLoopPrescriptionPayload } from '../schemas/openLoopDispatch';

type DispatchSourceRow = {
  prescription: {
    id: string;
    intake_id: string;
    medication_name: string;
    dosage_instructions: string;
  };
  patient: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    phone: string | null;
    shipping_address: unknown;
  };
  intake: {
    clinical_questionnaire: unknown;
  };
};

export function mapPrescriptionToOpenLoopPayload(row: DispatchSourceRow): OpenLoopPrescriptionPayload {
  const questionnaire =
    row.intake.clinical_questionnaire &&
    typeof row.intake.clinical_questionnaire === 'object' &&
    !Array.isArray(row.intake.clinical_questionnaire)
      ? (row.intake.clinical_questionnaire as Record<string, unknown>)
      : {};

  const shippingAddress =
    row.patient.shipping_address &&
    typeof row.patient.shipping_address === 'object' &&
    !Array.isArray(row.patient.shipping_address)
      ? (row.patient.shipping_address as Record<string, unknown>)
      : null;

  return {
    prescriptionId: row.prescription.id,
    intakeId: row.prescription.intake_id,
    patient: {
      id: row.patient.id,
      firstName: row.patient.first_name,
      lastName: row.patient.last_name,
      dateOfBirth: row.patient.date_of_birth,
      phone: row.patient.phone,
      shippingAddress,
    },
    medicationName: row.prescription.medication_name,
    dosageInstructions: row.prescription.dosage_instructions,
    clinicalQuestionnaire: questionnaire,
  };
}
