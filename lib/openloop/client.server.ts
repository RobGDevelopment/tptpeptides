import 'server-only';

import {
  openLoopPrescriptionPayloadSchema,
  type OpenLoopDispatchResult,
  type OpenLoopPrescriptionPayload,
} from '../schemas/openLoopDispatch';

export function isOpenLoopDryRunEnabled(): boolean {
  return process.env.OPENLOOP_DISPATCH_DRY_RUN?.trim().toLowerCase() === 'true';
}

export function isOpenLoopConfigured(): boolean {
  return Boolean(
    process.env.OPENLOOP_API_BASE?.trim() && process.env.OPENLOOP_API_KEY?.trim()
  );
}

export function isOpenLoopDispatchAvailable(): boolean {
  return isOpenLoopConfigured() || isOpenLoopDryRunEnabled();
}

function openLoopApiBase(): string {
  const base = process.env.OPENLOOP_API_BASE?.trim();
  if (!base) {
    throw new Error('OPENLOOP_API_BASE is not configured.');
  }
  return base.replace(/\/$/, '');
}

function openLoopApiKey(): string {
  const key = process.env.OPENLOOP_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENLOOP_API_KEY is not configured.');
  }
  return key;
}

export async function submitPrescriptionToOpenLoop(
  payload: OpenLoopPrescriptionPayload
): Promise<OpenLoopDispatchResult> {
  const validated = openLoopPrescriptionPayloadSchema.parse(payload);

  if (isOpenLoopDryRunEnabled() && !isOpenLoopConfigured()) {
    return { externalRxId: `dry-run-${validated.prescriptionId.slice(0, 8)}` };
  }

  const response = await fetch(`${openLoopApiBase()}/prescriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openLoopApiKey()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      external_prescription_id: validated.prescriptionId,
      external_intake_id: validated.intakeId,
      patient: {
        external_id: validated.patient.id,
        first_name: validated.patient.firstName,
        last_name: validated.patient.lastName,
        date_of_birth: validated.patient.dateOfBirth,
        phone: validated.patient.phone,
        shipping_address: validated.patient.shippingAddress,
      },
      medication: {
        name: validated.medicationName,
        dosage_instructions: validated.dosageInstructions,
      },
      clinical_questionnaire: validated.clinicalQuestionnaire,
    }),
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    prescription_id?: string;
    external_rx_id?: string;
    error?: { message?: string };
    message?: string;
  };

  if (!response.ok) {
    const message =
      body.error?.message ?? body.message ?? `OpenLoop API failed (${response.status})`;
    throw new Error(message);
  }

  const externalRxId = body.external_rx_id ?? body.prescription_id ?? body.id;
  if (!externalRxId?.trim()) {
    throw new Error('OpenLoop API succeeded but did not return a prescription identifier.');
  }

  return { externalRxId: externalRxId.trim() };
}
