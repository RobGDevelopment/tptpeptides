'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import {
  createPrescriptionSchema,
  type CreatePrescriptionPayload,
  type PrescriptionRow,
  type PrescriptionStatus,
  type PrescriptionDispatchStatus,
} from '../../../lib/schemas/prescription';
import { createAdminClient } from '../../../lib/supabase/admin';

const WELLNESS_INTAKES_PATH = '/admin/wellness/intakes';
const WELLNESS_PRESCRIPTIONS_PATH = '/admin/wellness/prescriptions';

type SupabasePatientProfile = {
  first_name: string | null;
  last_name: string | null;
};

type SupabasePrescriptionRow = {
  id: string;
  patient_id: string;
  intake_id: string;
  medication_name: string;
  dosage_instructions: string;
  status: PrescriptionStatus;
  created_at: string;
  dispatch_status?: PrescriptionDispatchStatus;
  external_rx_id?: string | null;
  dispatched_at?: string | null;
  patient_profiles: SupabasePatientProfile | SupabasePatientProfile[] | null;
};

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

function resolvePatientProfile(
  profile: SupabasePatientProfile | SupabasePatientProfile[] | null
): SupabasePatientProfile | null {
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

function mapPrescriptionRow(row: SupabasePrescriptionRow): PrescriptionRow {
  const profile = resolvePatientProfile(row.patient_profiles);
  return {
    id: row.id,
    patientId: row.patient_id,
    intakeId: row.intake_id,
    medicationName: row.medication_name,
    dosageInstructions: row.dosage_instructions,
    status: row.status,
    createdAt: row.created_at,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    dispatchStatus: row.dispatch_status ?? 'pending',
    externalRxId: row.external_rx_id ?? null,
    dispatchedAt: row.dispatched_at ?? null,
  };
}

export async function createPrescription(
  payload: CreatePrescriptionPayload
): Promise<{ ok: true; prescriptionId: string } | { ok: false; error: string }> {
  try {
    await assertWellnessAdminAccess();

    const validated = createPrescriptionSchema.safeParse(payload);
    if (!validated.success) {
      const message = validated.error.issues[0]?.message ?? 'Invalid prescription payload.';
      return { ok: false, error: message };
    }

    const { patientId, intakeId, medicationName, dosageInstructions } = validated.data;

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('prescriptions')
      .select('id')
      .eq('intake_id', intakeId)
      .neq('status', 'cancelled')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        error: 'A prescription already exists for this intake.',
      };
    }

    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: patientId,
        intake_id: intakeId,
        medication_name: medicationName.trim(),
        dosage_instructions: dosageInstructions.trim(),
        status: 'pending_fulfillment',
      })
      .select('id')
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath(WELLNESS_INTAKES_PATH);
    revalidatePath(`${WELLNESS_INTAKES_PATH}/${intakeId}`);
    revalidatePath(WELLNESS_PRESCRIPTIONS_PATH);

    return { ok: true, prescriptionId: data.id };
  } catch (caught) {
    if (caught instanceof AdminAuthError) {
      return { ok: false, error: caught.message };
    }
    const message = caught instanceof Error ? caught.message : 'Unable to create prescription.';
    return { ok: false, error: message };
  }
}

export async function getAllPrescriptions(): Promise<PrescriptionRow[]> {
  await assertWellnessAdminAccess();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('prescriptions')
    .select(
      `
      id,
      patient_id,
      intake_id,
      medication_name,
      dosage_instructions,
      status,
      created_at,
      dispatch_status,
      external_rx_id,
      dispatched_at,
      patient_profiles (
        first_name,
        last_name
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPrescriptionRow(row as unknown as SupabasePrescriptionRow));
}
