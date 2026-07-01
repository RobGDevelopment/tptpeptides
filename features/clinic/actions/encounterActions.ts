'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { runEncounterTranscriptionPipeline } from '../../../lib/clinic/ambient/transcribePipeline.server';
import { syncFullscriptLabOrdersFromEncounterFinalize } from '../../../lib/integrations/fullscript/labOrderSync.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import { createAdminClient } from '../../../lib/supabase/admin';
import { withSupabaseRetry } from '../../../lib/supabase/retry.server';
import {
  createClinicEncounterInputSchema,
  finalizeEncounterSchema,
  mapClinicEncounterRow,
  mapClinicEncounterTranscriptRow,
  saveEncounterSoapDraftSchema,
  startEncounterTranscriptionSchema,
  type ClinicEncounter,
  type ClinicEncounterTranscript,
  type ClinicEncounterTranscriptRow,
  type ClinicEncounterRow,
  type CreateClinicEncounterInput,
  type FinalizeEncounterInput,
  type SaveEncounterSoapDraftInput,
  type StartEncounterTranscriptionInput,
} from '../../../lib/schemas/clinicEncounters';

const ENCOUNTER_ADMIN_PATH = '/admin/wellness/encounters';

export type EncounterDetail = {
  encounter: ClinicEncounter;
  transcript: ClinicEncounterTranscript | null;
};

type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

async function assertWellnessProviderAccess(): Promise<string> {
  const headersList = await headers();
  const request = new Request('http://internal/admin/wellness/encounters', {
    headers: headersList,
  });

  const session = await requireAdminSession(request);

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    throw new AdminAuthError('Wellness module is not enabled.', 403);
  }

  return session.uid;
}

async function appendEncounterAuditLog(input: {
  encounterId: string;
  action: string;
  actorUid: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await withSupabaseRetry(async () =>
    supabase.from('clinic_encounter_audit_log').insert({
      encounter_id: input.encounterId,
      action: input.action,
      actor_uid: input.actorUid,
      metadata: input.metadata ?? {},
    })
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function loadEncounterDetail(encounterId: string): Promise<EncounterDetail | null> {
  const supabase = createAdminClient();

  const { data: encounterData, error: encounterError } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_encounters')
      .select(
        'id, patient_id, provider_uid, medical_intake_id, status, title, audio_storage_path, audio_mime_type, audio_expires_at, audio_deleted_at, healthscribe_job_id, healthscribe_job_status, failure_reason, started_at, completed_at, created_at, updated_at'
      )
      .eq('id', encounterId)
      .maybeSingle()
  );

  if (encounterError) {
    throw new Error(encounterError.message);
  }

  if (!encounterData) {
    return null;
  }

  const { data: transcriptData } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_encounter_transcripts')
      .select(
        'id, encounter_id, transcript_text, structured_note, speaker_segments, clinical_entities, model_id, model_version, created_at'
      )
      .eq('encounter_id', encounterId)
      .maybeSingle()
  );

  return {
    encounter: mapClinicEncounterRow(encounterData as ClinicEncounterRow),
    transcript: transcriptData
      ? mapClinicEncounterTranscriptRow(transcriptData as ClinicEncounterTranscriptRow)
      : null,
  };
}

export async function createEncounterDraft(
  rawInput: CreateClinicEncounterInput
): Promise<ActionResult<{ encounter: ClinicEncounter }>> {
  try {
    const providerUid = await assertWellnessProviderAccess();
    const input = createClinicEncounterInputSchema.parse(rawInput);
    const supabase = createAdminClient();

    const audioExpiresAt = new Date(
      Date.now() + input.audioExpiresInHours * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await withSupabaseRetry(async () =>
      supabase
        .from('clinic_encounters')
        .insert({
          patient_id: input.patientId,
          provider_uid: input.providerUid ?? providerUid,
          medical_intake_id: input.medicalIntakeId ?? null,
          title: input.title,
          status: 'draft',
          audio_expires_at: audioExpiresAt,
        })
        .select(
          'id, patient_id, provider_uid, medical_intake_id, status, title, audio_storage_path, audio_mime_type, audio_expires_at, audio_deleted_at, healthscribe_job_id, healthscribe_job_status, failure_reason, started_at, completed_at, created_at, updated_at'
        )
        .single()
    );

    if (error || !data) {
      return { ok: false, error: error?.message ?? 'Unable to create encounter.' };
    }

    const encounter = mapClinicEncounterRow(data as ClinicEncounterRow);

    await appendEncounterAuditLog({
      encounterId: encounter.id,
      action: 'encounter_created',
      actorUid: providerUid,
      metadata: { patientId: encounter.patientId },
    });

    revalidatePath(`${ENCOUNTER_ADMIN_PATH}/${encounter.id}`);
    return { ok: true, data: { encounter } };
  } catch (caught) {
    const message =
      caught instanceof AdminAuthError
        ? caught.message
        : caught instanceof Error
          ? caught.message
          : 'Unable to create encounter.';
    return { ok: false, error: message };
  }
}

export async function getEncounterDetail(
  encounterId: string
): Promise<ActionResult<EncounterDetail>> {
  try {
    await assertWellnessProviderAccess();
    const detail = await loadEncounterDetail(encounterId);

    if (!detail) {
      return { ok: false, error: 'Encounter not found.' };
    }

    return { ok: true, data: detail };
  } catch (caught) {
    const message =
      caught instanceof AdminAuthError
        ? caught.message
        : caught instanceof Error
          ? caught.message
          : 'Unable to load encounter.';
    return { ok: false, error: message };
  }
}

export async function startEncounterTranscription(
  rawInput: StartEncounterTranscriptionInput
): Promise<
  ActionResult<{
    encounterId: string;
    status: ClinicEncounter['status'];
    transcriptId: string;
  }>
> {
  try {
    const providerUid = await assertWellnessProviderAccess();
    const input = startEncounterTranscriptionSchema.parse({
      ...rawInput,
      actorUid: rawInput.actorUid ?? providerUid,
    });

    const result = await runEncounterTranscriptionPipeline(input);

    revalidatePath(`${ENCOUNTER_ADMIN_PATH}/${result.encounterId}`);
    return {
      ok: true,
      data: {
        encounterId: result.encounterId,
        status: result.status,
        transcriptId: result.transcriptId,
      },
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Transcription failed.';
    return { ok: false, error: message };
  }
}

export async function saveEncounterSoapDraft(
  rawInput: SaveEncounterSoapDraftInput
): Promise<ActionResult<{ encounterId: string }>> {
  try {
    const providerUid = await assertWellnessProviderAccess();
    const input = saveEncounterSoapDraftSchema.parse(rawInput);
    const detail = await loadEncounterDetail(input.encounterId);

    if (!detail) {
      return { ok: false, error: 'Encounter not found.' };
    }

    if (detail.encounter.status !== 'review') {
      return {
        ok: false,
        error: 'Only encounters in review can be saved as draft notes.',
      };
    }

    const supabase = createAdminClient();
    const { error } = await withSupabaseRetry(async () =>
      supabase
        .from('clinic_encounter_transcripts')
        .update({ structured_note: input.structuredNote })
        .eq('encounter_id', input.encounterId)
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    await appendEncounterAuditLog({
      encounterId: input.encounterId,
      action: 'note_draft_saved',
      actorUid: providerUid,
    });

    revalidatePath(`${ENCOUNTER_ADMIN_PATH}/${input.encounterId}`);
    return { ok: true, data: { encounterId: input.encounterId } };
  } catch (caught) {
    const message =
      caught instanceof AdminAuthError
        ? caught.message
        : caught instanceof Error
          ? caught.message
          : 'Unable to save draft note.';
    return { ok: false, error: message };
  }
}

export async function finalizeEncounter(
  rawInput: FinalizeEncounterInput
): Promise<
  ActionResult<{
    encounterId: string;
    labSyncCount: number;
  }>
> {
  try {
    const providerUid = await assertWellnessProviderAccess();
    const input = finalizeEncounterSchema.parse(rawInput);
    const detail = await loadEncounterDetail(input.encounterId);

    if (!detail) {
      return { ok: false, error: 'Encounter not found.' };
    }

    if (detail.encounter.status !== 'review') {
      return {
        ok: false,
        error: 'Only encounters in review can be finalized.',
      };
    }

    const supabase = createAdminClient();
    const finalizedAt = new Date().toISOString();

    const { error: transcriptError } = await withSupabaseRetry(async () =>
      supabase
        .from('clinic_encounter_transcripts')
        .update({ structured_note: input.structuredNote })
        .eq('encounter_id', input.encounterId)
    );

    if (transcriptError) {
      return { ok: false, error: transcriptError.message };
    }

    const { error: encounterError } = await withSupabaseRetry(async () =>
      supabase
        .from('clinic_encounters')
        .update({
          status: 'finalized',
          completed_at: finalizedAt,
        })
        .eq('id', input.encounterId)
    );

    if (encounterError) {
      return { ok: false, error: encounterError.message };
    }

    const labSync = await syncFullscriptLabOrdersFromEncounterFinalize({
      patientId: detail.encounter.patientId,
      encounterId: input.encounterId,
      providerUid,
      labOrders: input.labOrders,
    });

    await appendEncounterAuditLog({
      encounterId: input.encounterId,
      action: 'encounter_finalized',
      actorUid: providerUid,
      metadata: {
        providerSignature: input.providerSignature,
        labOrdersRequested: input.labOrders.length,
        labOrdersSynced: labSync.syncedCount,
        labResultIds: labSync.labResultIds,
        archived: true,
        archivedAt: finalizedAt,
      },
    });

    revalidatePath(`${ENCOUNTER_ADMIN_PATH}/${input.encounterId}`);
    revalidatePath('/admin/wellness/patients');

    return {
      ok: true,
      data: {
        encounterId: input.encounterId,
        labSyncCount: labSync.syncedCount,
      },
    };
  } catch (caught) {
    const message =
      caught instanceof AdminAuthError
        ? caught.message
        : caught instanceof Error
          ? caught.message
          : 'Unable to finalize encounter.';
    return { ok: false, error: message };
  }
}
