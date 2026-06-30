'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import { createAdminClient } from '../../../lib/supabase/admin';

const WELLNESS_INTAKES_PATH = '/admin/wellness/intakes';

const ADMIN_INTAKE_STATUSES = ['in_review', 'approved', 'rejected'] as const;
export type AdminIntakeStatus = (typeof ADMIN_INTAKE_STATUSES)[number];

export type MedicalIntakeRow = {
  id: string;
  status: string;
  submittedAt: string | null;
  patientId: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
};

export type MedicalIntakeShippingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

export type MedicalIntakeClinicalQuestionnaire = {
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  additionalNotes?: string;
};

export type MedicalIntakeConsent = {
  consentVersion: string;
  agreedAt: string;
};

export type MedicalIntakeDetail = {
  id: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  patientId: string;
  clinicalQuestionnaire: MedicalIntakeClinicalQuestionnaire;
  patient: {
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    phone: string | null;
    shippingAddress: MedicalIntakeShippingAddress | null;
  };
  consent: MedicalIntakeConsent | null;
};

type SupabasePatientProfile = {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  phone?: string | null;
  shipping_address?: MedicalIntakeShippingAddress | null;
  telehealth_consents?: SupabaseConsentRow | SupabaseConsentRow[] | null;
};

type SupabaseConsentRow = {
  consent_version: string;
  agreed_at: string;
};

type SupabaseIntakeRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  created_at?: string;
  patient_id: string;
  clinical_questionnaire?: unknown;
  patient_profiles: SupabasePatientProfile | SupabasePatientProfile[] | null;
};

type SupabaseIntakeListRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  patient_id: string;
  patient_profiles: SupabasePatientProfile | SupabasePatientProfile[] | null;
};

async function assertWellnessAdminAccess(): Promise<void> {
  const headersList = await headers();
  const request = new Request('http://internal/admin/wellness/intakes', {
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

function resolveConsentRows(
  consents: SupabasePatientProfile['telehealth_consents']
): SupabaseConsentRow[] {
  if (!consents) return [];
  return Array.isArray(consents) ? consents : [consents];
}

function parseShippingAddress(raw: unknown): MedicalIntakeShippingAddress | null {
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

function parseClinicalQuestionnaire(raw: unknown): MedicalIntakeClinicalQuestionnaire {
  if (!raw || typeof raw !== 'object') return {};
  const questionnaire = raw as Record<string, unknown>;
  return {
    medicalHistory:
      typeof questionnaire.medicalHistory === 'string' ? questionnaire.medicalHistory : undefined,
    allergies: typeof questionnaire.allergies === 'string' ? questionnaire.allergies : undefined,
    currentMedications:
      typeof questionnaire.currentMedications === 'string'
        ? questionnaire.currentMedications
        : undefined,
    additionalNotes:
      typeof questionnaire.additionalNotes === 'string' ? questionnaire.additionalNotes : undefined,
  };
}

function mapLatestConsent(profile: SupabasePatientProfile | null): MedicalIntakeConsent | null {
  const consents = resolveConsentRows(profile?.telehealth_consents);
  if (consents.length === 0) return null;

  const latest = [...consents].sort(
    (left, right) => new Date(right.agreed_at).getTime() - new Date(left.agreed_at).getTime()
  )[0];

  return {
    consentVersion: latest.consent_version,
    agreedAt: latest.agreed_at,
  };
}

function mapIntakeRow(row: SupabaseIntakeListRow): MedicalIntakeRow {
  const profile = resolvePatientProfile(row.patient_profiles);
  return {
    id: row.id,
    status: row.status,
    submittedAt: row.submitted_at,
    patientId: row.patient_id,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    dateOfBirth: profile?.date_of_birth ?? null,
  };
}

export async function getMedicalIntakes(): Promise<MedicalIntakeRow[]> {
  await assertWellnessAdminAccess();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('medical_intakes')
    .select(
      `
      id,
      status,
      submitted_at,
      patient_id,
      patient_profiles (
        first_name,
        last_name,
        date_of_birth
      )
    `
    )
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapIntakeRow(row as unknown as SupabaseIntakeListRow));
}

function mapIntakeDetail(row: SupabaseIntakeRow): MedicalIntakeDetail {
  const profile = resolvePatientProfile(row.patient_profiles);
  return {
    id: row.id,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at ?? row.submitted_at ?? new Date().toISOString(),
    patientId: row.patient_id,
    clinicalQuestionnaire: parseClinicalQuestionnaire(row.clinical_questionnaire),
    patient: {
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      dateOfBirth: profile?.date_of_birth ?? null,
      phone: profile?.phone ?? null,
      shippingAddress: parseShippingAddress(profile?.shipping_address),
    },
    consent: mapLatestConsent(profile),
  };
}

export async function getMedicalIntakeById(intakeId: string): Promise<MedicalIntakeDetail | null> {
  await assertWellnessAdminAccess();

  const trimmedId = intakeId.trim();
  if (!trimmedId) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('medical_intakes')
    .select(
      `
      id,
      status,
      submitted_at,
      created_at,
      patient_id,
      clinical_questionnaire,
      patient_profiles (
        first_name,
        last_name,
        date_of_birth,
        phone,
        shipping_address,
        telehealth_consents (
          consent_version,
          agreed_at
        )
      )
    `
    )
    .eq('id', trimmedId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return mapIntakeDetail(data as unknown as SupabaseIntakeRow);
}

export async function updateIntakeStatus(
  intakeId: string,
  newStatus: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertWellnessAdminAccess();

    const trimmedId = intakeId.trim();
    if (!trimmedId) {
      return { ok: false, error: 'Intake ID is required.' };
    }

    if (!ADMIN_INTAKE_STATUSES.includes(newStatus as AdminIntakeStatus)) {
      return { ok: false, error: 'Invalid intake status.' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('medical_intakes')
      .update({ status: newStatus })
      .eq('id', trimmedId);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath(WELLNESS_INTAKES_PATH);
    revalidatePath(`${WELLNESS_INTAKES_PATH}/${trimmedId}`);
    return { ok: true };
  } catch (caught) {
    if (caught instanceof AdminAuthError) {
      return { ok: false, error: caught.message };
    }
    const message = caught instanceof Error ? caught.message : 'Unable to update intake status.';
    return { ok: false, error: message };
  }
}

export type WellnessPatientRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  createdAt: string;
};

type SupabasePatientListRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  phone: string | null;
  created_at: string;
};

export async function getAllPatients(): Promise<WellnessPatientRow[]> {
  await assertWellnessAdminAccess();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('id, first_name, last_name, date_of_birth, phone, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const patient = row as SupabasePatientListRow;
    return {
      id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth,
      phone: patient.phone,
      createdAt: patient.created_at,
    };
  });
}
