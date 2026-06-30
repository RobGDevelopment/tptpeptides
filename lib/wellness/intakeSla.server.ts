import 'server-only';

import { createAdminClient } from '../supabase/admin';

export type StaleIntakeRow = {
  id: string;
  patientId: string;
  submittedAt: string;
  firstName: string | null;
  lastName: string | null;
};

type SupabaseStaleIntakeRow = {
  id: string;
  patient_id: string;
  submitted_at: string;
  patient_profiles:
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null;
};

function resolveProfile(
  profile: SupabaseStaleIntakeRow['patient_profiles']
): { first_name: string | null; last_name: string | null } | null {
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

export async function listStaleMedicalIntakes(slaHours = 24): Promise<StaleIntakeRow[]> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('medical_intakes')
    .select(
      `
      id,
      patient_id,
      submitted_at,
      patient_profiles (
        first_name,
        last_name
      )
    `
    )
    .eq('status', 'submitted')
    .is('sla_alerted_at', null)
    .not('submitted_at', 'is', null)
    .lt('submitted_at', cutoff);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const intake = row as unknown as SupabaseStaleIntakeRow;
    const profile = resolveProfile(intake.patient_profiles);
    return {
      id: intake.id,
      patientId: intake.patient_id,
      submittedAt: intake.submitted_at,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
    };
  });
}

export async function markIntakesSlaAlerted(intakeIds: string[]): Promise<void> {
  if (intakeIds.length === 0) return;

  const supabase = createAdminClient();
  const alertedAt = new Date().toISOString();
  const { error } = await supabase
    .from('medical_intakes')
    .update({ sla_alerted_at: alertedAt })
    .in('id', intakeIds);

  if (error) {
    throw new Error(error.message);
  }
}

export type IntakeSlaProcessResult = {
  staleCount: number;
  emailed: boolean;
  markedCount: number;
};

/** Query stale intakes, send ops alert, and stamp sla_alerted_at to dedupe future cron runs. */
export async function processIntakeSlaViolations(slaHours = 24): Promise<IntakeSlaProcessResult> {
  const { sendWellnessSlaAlertEmail } = await import('../email/wellnessSlaAlert.server');

  const staleIntakes = await listStaleMedicalIntakes(slaHours);
  if (staleIntakes.length === 0) {
    return { staleCount: 0, emailed: false, markedCount: 0 };
  }

  const emailed = await sendWellnessSlaAlertEmail(staleIntakes);

  if (emailed) {
    await markIntakesSlaAlerted(staleIntakes.map((intake) => intake.id));
  }

  return {
    staleCount: staleIntakes.length,
    emailed,
    markedCount: emailed ? staleIntakes.length : 0,
  };
}
