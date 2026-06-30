'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import { isOpenLoopDispatchAvailable, submitPrescriptionToOpenLoop } from '../../../lib/openloop/client.server';
import { mapPrescriptionToOpenLoopPayload } from '../../../lib/openloop/mapPrescriptionPayload.server';
import { createAdminClient } from '../../../lib/supabase/admin';

const WELLNESS_PRESCRIPTIONS_PATH = '/admin/wellness/prescriptions';
const WELLNESS_INTAKES_PATH = '/admin/wellness/intakes';

async function assertWellnessAdminAccess(): Promise<void> {
  const headersList = await headers();
  const request = new Request('http://internal/admin/wellness', {
    headers: headersList,
  });

  await requireAdminSession(request);

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    throw new AdminAuthError('Wellness module is not enabled.', 403);
  }
}

type DispatchBundleRow = {
  id: string;
  intake_id: string;
  patient_id: string;
  medication_name: string;
  dosage_instructions: string;
  dispatch_status: string;
  dispatch_attempts: number;
  patient_profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    phone: string | null;
    shipping_address: unknown;
  } | {
    id: string;
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    phone: string | null;
    shipping_address: unknown;
  }[] | null;
  medical_intakes: {
    clinical_questionnaire: unknown;
  } | {
    clinical_questionnaire: unknown;
  }[] | null;
};

function resolveSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function dispatchPrescriptionToOpenLoop(
  prescriptionId: string
): Promise<{ ok: true; externalRxId: string } | { ok: false; error: string }> {
  try {
    await assertWellnessAdminAccess();

    if (!(await isOpenLoopDispatchAvailable())) {
      return {
        ok: false,
        error:
          'OpenLoop dispatch is not available. Set OPENLOOP_API_BASE + OPENLOOP_API_KEY, or OPENLOOP_DISPATCH_DRY_RUN=true for local testing.',
      };
    }

    const trimmedId = prescriptionId.trim();
    if (!trimmedId) {
      return { ok: false, error: 'Prescription ID is required.' };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('prescriptions')
      .select(
        `
        id,
        intake_id,
        patient_id,
        medication_name,
        dosage_instructions,
        dispatch_status,
        dispatch_attempts,
        patient_profiles (
          id,
          first_name,
          last_name,
          date_of_birth,
          phone,
          shipping_address
        ),
        medical_intakes (
          clinical_questionnaire
        )
      `
      )
      .eq('id', trimmedId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }
    if (!data) {
      return { ok: false, error: 'Prescription not found.' };
    }

    const row = data as unknown as DispatchBundleRow;
    if (row.dispatch_status === 'sent' || row.dispatch_status === 'confirmed') {
      return { ok: false, error: 'This prescription has already been dispatched.' };
    }

    const patient = resolveSingle(row.patient_profiles);
    const intake = resolveSingle(row.medical_intakes);
    if (!patient || !intake) {
      return { ok: false, error: 'Patient or intake data is missing for this prescription.' };
    }

    const payload = mapPrescriptionToOpenLoopPayload({
      prescription: row,
      patient,
      intake,
    });

    const attempts = (row.dispatch_attempts ?? 0) + 1;

    try {
      const result = await submitPrescriptionToOpenLoop(payload);

      const { error: updateError } = await supabase
        .from('prescriptions')
        .update({
          dispatch_status: 'sent',
          external_rx_id: result.externalRxId,
          dispatched_at: new Date().toISOString(),
          dispatch_error: null,
          dispatch_attempts: attempts,
          status: 'active',
        })
        .eq('id', trimmedId);

      if (updateError) {
        return { ok: false, error: updateError.message };
      }

      revalidatePath(WELLNESS_PRESCRIPTIONS_PATH);
      revalidatePath(`${WELLNESS_INTAKES_PATH}/${row.intake_id}`);

      return { ok: true, externalRxId: result.externalRxId };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'OpenLoop dispatch failed.';

      await supabase
        .from('prescriptions')
        .update({
          dispatch_status: 'failed',
          dispatch_error: { message, at: new Date().toISOString() },
          dispatch_attempts: attempts,
        })
        .eq('id', trimmedId);

      revalidatePath(WELLNESS_PRESCRIPTIONS_PATH);
      return { ok: false, error: message };
    }
  } catch (caught) {
    if (caught instanceof AdminAuthError) {
      return { ok: false, error: caught.message };
    }
    const message = caught instanceof Error ? caught.message : 'Unable to dispatch prescription.';
    return { ok: false, error: message };
  }
}
