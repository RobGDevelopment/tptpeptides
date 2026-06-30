'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import {
  profileUpdateSchema,
  type PatientDashboardData,
  type ProfileUpdatePayload,
} from '../../../lib/schemas/clinicPatientPortal';
import type {
  PatientPortalIntake,
  PatientPortalPrescription,
  PatientPortalProfile,
  PatientPortalShippingAddress,
} from '../../../lib/schemas/clinicPatientPortal';

const CLINIC_DASHBOARD_PATH = '/clinic/dashboard';

type PatientProfileRow = {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  phone: string | null;
  shipping_address: unknown;
};

type MedicalIntakeRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
};

type PrescriptionRow = {
  id: string;
  medication_name: string;
  dosage_instructions: string;
  status: string;
  created_at: string;
};

function parseShippingAddress(raw: unknown): PatientPortalShippingAddress | null {
  if (!raw || typeof raw !== 'object') return null;
  const address = raw as Record<string, unknown>;
  return {
    line1: typeof address.line1 === 'string' ? address.line1 : undefined,
    line2: typeof address.line2 === 'string' ? address.line2 : undefined,
    city: typeof address.city === 'string' ? address.city : undefined,
    state: typeof address.state === 'string' ? address.state : undefined,
    postal_code: typeof address.postal_code === 'string' ? address.postal_code : undefined,
    country: typeof address.country === 'string' ? address.country : undefined,
  };
}

function mapProfile(row: PatientProfileRow | null): PatientPortalProfile {
  return {
    firstName: row?.first_name ?? null,
    lastName: row?.last_name ?? null,
    dateOfBirth: row?.date_of_birth ?? null,
    phone: row?.phone ?? null,
    shippingAddress: parseShippingAddress(row?.shipping_address),
  };
}

function mapIntake(row: MedicalIntakeRow): PatientPortalIntake {
  return {
    id: row.id,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
  };
}

function mapPrescription(row: PrescriptionRow): PatientPortalPrescription {
  return {
    id: row.id,
    medicationName: row.medication_name,
    dosageInstructions: row.dosage_instructions,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getPatientDashboardData(): Promise<PatientDashboardData | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const [profileResult, intakeResult, prescriptionsResult] = await Promise.all([
    supabase
      .from('patient_profiles')
      .select('first_name, last_name, date_of_birth, phone, shipping_address')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('medical_intakes')
      .select('id, status, submitted_at, created_at')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('prescriptions')
      .select('id, medication_name, dosage_instructions, status, created_at')
      .eq('patient_id', user.id)
      .in('status', ['pending_fulfillment', 'active'])
      .order('created_at', { ascending: false }),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }
  if (intakeResult.error) {
    throw new Error(intakeResult.error.message);
  }
  if (prescriptionsResult.error) {
    throw new Error(prescriptionsResult.error.message);
  }

  return {
    profile: mapProfile(profileResult.data as PatientProfileRow | null),
    latestIntake: intakeResult.data
      ? mapIntake(intakeResult.data as MedicalIntakeRow)
      : null,
    prescriptions: (prescriptionsResult.data ?? []).map((row) =>
      mapPrescription(row as PrescriptionRow)
    ),
  };
}

export async function updatePatientProfile(
  payload: ProfileUpdatePayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: 'You must be signed in to update your profile.' };
  }

  const validated = profileUpdateSchema.safeParse(payload);
  if (!validated.success) {
    const message = validated.error.issues[0]?.message ?? 'Invalid profile data.';
    return { ok: false, error: message };
  }

  const { error } = await supabase
    .from('patient_profiles')
    .update({
      phone: validated.data.phone.trim(),
      shipping_address: validated.data.shippingAddress,
    })
    .eq('id', user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(CLINIC_DASHBOARD_PATH);
  return { ok: true };
}
