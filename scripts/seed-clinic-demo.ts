/**
 * Seed Supabase clinic demo patients for local end-to-end testing.
 *
 * Usage:
 *   npm run seed:clinic-demo
 *   npm run seed:clinic-demo -- --full
 *   npm run seed:clinic-demo -- --sla
 *   npm run seed:clinic-demo -- --reset
 */
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { CLINIC_CONSENT_VERSION } from '../lib/schemas/clinicIntake';

config({ path: resolve(process.cwd(), '.env.local') });

const DEMO_EMAIL = 'patient.demo@test.com';
const DEMO_PASSWORD = 'ClinicDemo2026!';
const SLA_EMAIL = 'sla.stale@test.com';
const SLA_PASSWORD = 'ClinicDemo2026!';

const DEMO_PROFILE = {
  first_name: 'Alex',
  last_name: 'Demo',
  date_of_birth: '1985-06-15',
  phone: '+15555550100',
  shipping_address: {
    line1: '100 Wellness Way',
    city: 'Austin',
    state: 'TX',
    postal_code: '78701',
    country: 'US',
  },
};

const DEMO_QUESTIONNAIRE = {
  medicalHistory: 'No significant surgical history. Mild seasonal allergies.',
  allergies: 'None',
  currentMedications: 'None',
  additionalNotes: 'Seeded by scripts/seed-clinic-demo.ts',
};

type SeedFlags = {
  full: boolean;
  sla: boolean;
  reset: boolean;
};

function parseFlags(): SeedFlags {
  const args = process.argv.slice(2);
  return {
    full: args.includes('--full'),
    sla: args.includes('--sla'),
    reset: args.includes('--reset'),
  };
}

function requireSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function findUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureAuthUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<string> {
  const existingId = await findUserIdByEmail(supabase, email);
  if (existingId) {
    await supabase.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
    });
    return existingId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error(`Failed to create auth user for ${email}`);
  return data.user.id;
}

async function resetDemoPatient(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.from('prescriptions').delete().eq('patient_id', userId);
  await supabase.from('medical_intakes').delete().eq('patient_id', userId);
  await supabase.from('telehealth_consents').delete().eq('patient_id', userId);
}

async function upsertProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('patient_profiles').upsert(
    {
      id: userId,
      ...DEMO_PROFILE,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

async function ensureConsent(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('telehealth_consents')
    .select('id')
    .eq('patient_id', userId)
    .eq('consent_version', CLINIC_CONSENT_VERSION)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return;

  const { error: insertError } = await supabase.from('telehealth_consents').insert({
    patient_id: userId,
    consent_version: CLINIC_CONSENT_VERSION,
    user_agent: 'scripts/seed-clinic-demo.ts',
  });
  if (insertError) throw insertError;
}

async function ensureSubmittedIntake(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from('medical_intakes')
    .select('id, status')
    .eq('patient_id', userId)
    .in('status', ['submitted', 'in_review', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id;

  const submittedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('medical_intakes')
    .insert({
      patient_id: userId,
      status: 'submitted',
      clinical_questionnaire: DEMO_QUESTIONNAIRE,
      submitted_at: submittedAt,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function approveIntakeAndPrescribe(
  supabase: SupabaseClient,
  userId: string,
  intakeId: string
): Promise<string> {
  const { error: approveError } = await supabase
    .from('medical_intakes')
    .update({ status: 'approved' })
    .eq('id', intakeId);
  if (approveError) throw approveError;

  const { data: existingRx, error: existingRxError } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('intake_id', intakeId)
    .neq('status', 'cancelled')
    .limit(1)
    .maybeSingle();
  if (existingRxError) throw existingRxError;
  if (existingRx) return existingRx.id;

  const { data, error } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: userId,
      intake_id: intakeId,
      medication_name: 'Semaglutide 0.25mg',
      dosage_instructions: 'Inject subcutaneously once weekly. Demo seed prescription.',
      status: 'pending_fulfillment',
      dispatch_status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function seedStaleSlaIntake(supabase: SupabaseClient): Promise<string> {
  const userId = await ensureAuthUser(supabase, SLA_EMAIL, SLA_PASSWORD);
  await upsertProfile(supabase, userId);
  await ensureConsent(supabase, userId);

  const staleSubmittedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

  const { data: existing, error: existingError } = await supabase
    .from('medical_intakes')
    .select('id')
    .eq('patient_id', userId)
    .eq('status', 'submitted')
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from('medical_intakes')
      .update({
        submitted_at: staleSubmittedAt,
        sla_alerted_at: null,
        clinical_questionnaire: {
          ...DEMO_QUESTIONNAIRE,
          additionalNotes: 'SLA stale seed — waiting >24h for review',
        },
      })
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from('medical_intakes')
    .insert({
      patient_id: userId,
      status: 'submitted',
      clinical_questionnaire: {
        ...DEMO_QUESTIONNAIRE,
        additionalNotes: 'SLA stale seed — waiting >24h for review',
      },
      submitted_at: staleSubmittedAt,
      sla_alerted_at: null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const flags = parseFlags();
  const supabase = requireSupabase();

  const userId = await ensureAuthUser(supabase, DEMO_EMAIL, DEMO_PASSWORD);

  if (flags.reset) {
    await resetDemoPatient(supabase, userId);
    console.log('✓ Reset demo patient prescriptions, intakes, and consents');
  }

  await upsertProfile(supabase, userId);
  await ensureConsent(supabase, userId);
  const intakeId = await ensureSubmittedIntake(supabase, userId);

  console.log('✓ Demo patient ready');
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Intake:   ${intakeId} (submitted)`);

  if (flags.full) {
    const prescriptionId = await approveIntakeAndPrescribe(supabase, userId, intakeId);
    console.log(`✓ Approved intake and created prescription ${prescriptionId}`);
    console.log('  Admin: /admin/wellness/prescriptions — use Dispatch (dry-run when OPENLOOP_DISPATCH_DRY_RUN=true)');
  }

  if (flags.sla) {
    const slaIntakeId = await seedStaleSlaIntake(supabase);
    console.log(`✓ SLA stale intake ready: ${slaIntakeId}`);
    console.log(`  Patient: ${SLA_EMAIL} / ${SLA_PASSWORD}`);
    console.log('  Run: npm run test:clinic-sla (with dev server running)');
  }

  console.log('\nClinic routes on localhost (no TENANT_CLINIC_HOSTS required after constants update):');
  console.log('  /clinic');
  console.log('  /clinic/intake');
  console.log('  /clinic/dashboard');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
