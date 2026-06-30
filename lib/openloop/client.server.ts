import 'server-only';

import { IntegrationNotConfiguredError } from '../integrations/errors';
import { resolveIntegration } from '../integrations/resolver.server';
import {
  openLoopPrescriptionPayloadSchema,
  type OpenLoopDispatchResult,
  type OpenLoopPrescriptionPayload,
} from '../schemas/openLoopDispatch';

type OpenLoopRuntime =
  | { kind: 'live'; baseUrl: string; apiKey: string }
  | { kind: 'dry_run' };

function isEnvDryRunEnabled(): boolean {
  return process.env.OPENLOOP_DISPATCH_DRY_RUN?.trim().toLowerCase() === 'true';
}

function resolveOpenLoopFromEnv(): OpenLoopRuntime | null {
  const apiKey = process.env.OPENLOOP_API_KEY?.trim();
  const baseUrl = process.env.OPENLOOP_API_BASE?.trim()?.replace(/\/$/, '');

  if (isEnvDryRunEnabled()) {
    return { kind: 'dry_run' };
  }

  if (apiKey && baseUrl) {
    return { kind: 'live', baseUrl, apiKey };
  }

  return null;
}

async function getOpenLoopRuntime(): Promise<OpenLoopRuntime> {
  try {
    const resolved = await resolveIntegration('openloop', { fallbackEnv: true });

    if (resolved.mode === 'live') {
      const baseUrl = resolved.publicConfig.baseUrl?.trim().replace(/\/$/, '');
      const apiKey = resolved.secrets.apiKey?.trim();
      if (!baseUrl || !apiKey) {
        throw new Error('OpenLoop live mode requires API base URL and API key.');
      }
      return { kind: 'live', baseUrl, apiKey };
    }

    return { kind: 'dry_run' };
  } catch (caught) {
    if (!(caught instanceof IntegrationNotConfiguredError)) {
      throw caught;
    }
  }

  const envRuntime = resolveOpenLoopFromEnv();
  if (envRuntime) {
    return envRuntime;
  }

  throw new IntegrationNotConfiguredError('openloop');
}

export function isOpenLoopDryRunEnabled(): boolean {
  return isEnvDryRunEnabled();
}

export async function isOpenLoopConfigured(): Promise<boolean> {
  try {
    const runtime = await getOpenLoopRuntime();
    return runtime.kind === 'live';
  } catch {
    return Boolean(
      process.env.OPENLOOP_API_BASE?.trim() && process.env.OPENLOOP_API_KEY?.trim()
    );
  }
}

export async function isOpenLoopDispatchAvailable(): Promise<boolean> {
  try {
    await getOpenLoopRuntime();
    return true;
  } catch {
    return isEnvDryRunEnabled() || Boolean(process.env.OPENLOOP_API_KEY?.trim());
  }
}

export async function submitPrescriptionToOpenLoop(
  payload: OpenLoopPrescriptionPayload
): Promise<OpenLoopDispatchResult> {
  const validated = openLoopPrescriptionPayloadSchema.parse(payload);
  const runtime = await getOpenLoopRuntime();

  if (runtime.kind === 'dry_run') {
    return { externalRxId: `dry-run-${validated.prescriptionId.slice(0, 8)}` };
  }

  const response = await fetch(`${runtime.baseUrl}/prescriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runtime.apiKey}`,
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
