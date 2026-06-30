'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import {
  uploadLabResultSchema,
  sendProviderMessageSchema,
  type ClinicLabResult,
  type ClinicMessage,
} from '../../../lib/schemas/clinicCare';
import { createAdminClient } from '../../../lib/supabase/admin';

const WELLNESS_INTAKES_PATH = '/admin/wellness/intakes';
const CLINIC_LABS_BUCKET = 'clinic_labs';
const LAB_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const LAB_MAX_BYTES = 12 * 1024 * 1024;

function resolveLabExtension(fileName: string, mimeType: string): string | null {
  const fromName = fileName.split('.').pop()?.toLowerCase();
  if (fromName === 'pdf' || fromName === 'png' || fromName === 'jpg' || fromName === 'jpeg') {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }

  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';

  return null;
}

function resolveLabMimeType(file: File): string {
  const trimmed = file.type.trim();
  if (trimmed && LAB_MIME_TYPES.has(trimmed)) {
    return trimmed;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';

  return 'application/pdf';
}

type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

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

async function assertWellnessAdminAccess(): Promise<string> {
  const headersList = await headers();
  const request = new Request('http://internal/admin/wellness', {
    headers: headersList,
  });

  const session = await requireAdminSession(request);

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    throw new AdminAuthError('Wellness module is not enabled.', 403);
  }

  return session.uid;
}

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

export async function getProviderMessages(patientId: string): Promise<ClinicMessage[]> {
  await assertWellnessAdminAccess();

  const supabase = createAdminClient();
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

export async function sendMessageToPatient(
  patientId: string,
  content: string
): Promise<ActionResult> {
  try {
    const providerUid = await assertWellnessAdminAccess();
    const parsed = sendProviderMessageSchema.safeParse({ patientId, content });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid message.';
      return { ok: false, error: message };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('clinic_messages').insert({
      patient_id: parsed.data.patientId,
      provider_uid: providerUid,
      sender_role: 'provider',
      content: parsed.data.content,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath(WELLNESS_INTAKES_PATH);
    revalidatePath(`/admin/wellness/intakes`);
    revalidatePath('/clinic/dashboard');

    return { ok: true };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unable to send message.';
    return { ok: false, error: message };
  }
}

export async function uploadLabResult(
  formData: FormData
): Promise<ActionResult<{ lab: ClinicLabResult }>> {
  try {
    await assertWellnessAdminAccess();

    const patientId = String(formData.get('patientId') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim();
    const providerNotes = String(formData.get('providerNotes') ?? '').trim();
    const statusRaw = String(formData.get('status') ?? 'pending').trim();
    const file = formData.get('file');

    const parsed = uploadLabResultSchema.safeParse({
      patientId,
      title,
      providerNotes: providerNotes || null,
      status: statusRaw === 'reviewed' ? 'reviewed' : 'pending',
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid lab result payload.';
      return { ok: false, error: message };
    }

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'A lab document file is required.' };
    }

    if (file.size > LAB_MAX_BYTES) {
      return { ok: false, error: 'Lab file exceeds 12 MB limit.' };
    }

    const mimeType = resolveLabMimeType(file);
    if (!LAB_MIME_TYPES.has(mimeType)) {
      return { ok: false, error: 'Unsupported lab file type. Upload PDF, JPG, or PNG.' };
    }

    const extension = resolveLabExtension(file.name, mimeType);
    if (!extension) {
      return { ok: false, error: 'Unsupported lab file type. Upload PDF, JPG, or PNG.' };
    }

    const storagePath = `${parsed.data.patientId}/${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = createAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(CLINIC_LABS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, error: uploadError.message };
    }

    const { data, error } = await supabase
      .from('clinic_lab_results')
      .insert({
        patient_id: parsed.data.patientId,
        title: parsed.data.title,
        status: parsed.data.status,
        file_url: storagePath,
        provider_notes: parsed.data.providerNotes ?? null,
      })
      .select('id, patient_id, title, status, file_url, provider_notes, created_at')
      .single();

    if (error) {
      await supabase.storage.from(CLINIC_LABS_BUCKET).remove([storagePath]);
      return { ok: false, error: error.message };
    }

    revalidatePath(WELLNESS_INTAKES_PATH);
    revalidatePath('/clinic/dashboard');

    return { ok: true, data: { lab: mapLabResult(data as ClinicLabResultRow) } };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unable to upload lab result.';
    return { ok: false, error: message };
  }
}
