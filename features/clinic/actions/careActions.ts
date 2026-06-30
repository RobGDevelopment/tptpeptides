'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import {
  sendPatientMessageSchema,
  type ClinicLabResult,
  type ClinicMessage,
} from '../../../lib/schemas/clinicCare';

const CLINIC_DASHBOARD_PATH = '/clinic/dashboard';

type ClinicMessageRow = {
  id: string;
  patient_id: string;
  provider_uid: string | null;
  sender_role: 'patient' | 'provider';
  content: string;
  read_at: string | null;
  created_at: string;
};

type ClinicLabResultRow = {
  id: string;
  patient_id: string;
  title: string;
  status: 'pending' | 'reviewed';
  file_url: string;
  provider_notes: string | null;
  created_at: string;
};

function mapMessage(row: ClinicMessageRow): ClinicMessage {
  return {
    id: row.id,
    patientId: row.patient_id,
    providerUid: row.provider_uid,
    senderRole: row.sender_role,
    content: row.content,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function mapLabResult(row: ClinicLabResultRow): ClinicLabResult {
  return {
    id: row.id,
    patientId: row.patient_id,
    title: row.title,
    status: row.status,
    fileUrl: row.file_url,
    providerNotes: row.provider_notes,
    createdAt: row.created_at,
  };
}

async function requirePatientUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user.id;
}

export async function getPatientMessages(): Promise<ClinicMessage[]> {
  const patientId = await requirePatientUserId();
  if (!patientId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clinic_messages')
    .select('id, patient_id, provider_uid, sender_role, content, read_at, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapMessage(row as ClinicMessageRow));
}

export async function sendMessageToProvider(
  content: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const patientId = await requirePatientUserId();
  if (!patientId) {
    return { ok: false, error: 'You must be signed in to send a message.' };
  }

  const parsed = sendPatientMessageSchema.safeParse({ content });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid message.';
    return { ok: false, error: message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('clinic_messages').insert({
    patient_id: patientId,
    sender_role: 'patient',
    content: parsed.data.content,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(CLINIC_DASHBOARD_PATH);
  return { ok: true };
}

export async function getPatientLabs(): Promise<ClinicLabResult[]> {
  const patientId = await requirePatientUserId();
  if (!patientId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clinic_lab_results')
    .select('id, patient_id, title, status, file_url, provider_notes, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapLabResult(row as ClinicLabResultRow));
}
