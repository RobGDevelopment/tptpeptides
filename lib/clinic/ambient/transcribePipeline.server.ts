import 'server-only';

import { createAdminClient } from '../../supabase/admin';
import { withSupabaseRetry } from '../../supabase/retry.server';
import {
  deleteHealthScribeInputObject,
  isHealthScribeConfigured,
  startHealthScribeJob,
  uploadHealthScribeInputObject,
  waitForHealthScribeJob,
} from './healthScribe.client.server';
import {
  ENCOUNTER_AUDIO_BUCKET,
  mapClinicEncounterRow,
  type ClinicEncounter,
  type ClinicEncounterAuditAction,
  type ClinicEncounterRow,
  type StartEncounterTranscriptionInput,
  startEncounterTranscriptionSchema,
} from '../../schemas/clinicEncounters';

export type TranscriptionPipelineResult = {
  encounterId: string;
  status: ClinicEncounter['status'];
  transcriptId: string;
  healthscribeJobId: string;
  audioDeleted: boolean;
  dryRun: boolean;
};

type EncounterAuditInput = {
  encounterId: string;
  action: ClinicEncounterAuditAction;
  actorUid?: string | null;
  metadata?: Record<string, unknown>;
};

async function appendEncounterAuditLog(input: EncounterAuditInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await withSupabaseRetry(async () =>
    supabase.from('clinic_encounter_audit_log').insert({
      encounter_id: input.encounterId,
      action: input.action,
      actor_uid: input.actorUid ?? null,
      metadata: input.metadata ?? {},
    })
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function getEncounterRow(encounterId: string): Promise<ClinicEncounterRow> {
  const supabase = createAdminClient();
  const { data, error } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_encounters')
      .select(
        'id, patient_id, provider_uid, medical_intake_id, status, title, audio_storage_path, audio_mime_type, audio_expires_at, audio_deleted_at, healthscribe_job_id, healthscribe_job_status, failure_reason, started_at, completed_at, created_at, updated_at'
      )
      .eq('id', encounterId)
      .single()
  );

  if (error || !data) {
    throw new Error(error?.message ?? 'Encounter not found.');
  }

  return data as ClinicEncounterRow;
}

async function updateEncounter(
  encounterId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await withSupabaseRetry(async () =>
    supabase.from('clinic_encounters').update(patch).eq('id', encounterId)
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function downloadEncounterAudio(storagePath: string): Promise<Buffer> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(ENCOUNTER_AUDIO_BUCKET).download(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to download encounter audio.');
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * HIPAA-critical deletion path:
 * 1. Remove object from Supabase Storage (clinic_encounters_audio)
 * 2. Remove staged object from AWS HealthScribe input bucket
 * 3. Nullify audio_storage_path and stamp audio_deleted_at
 * 4. Write immutable audit log entry
 */
export async function deleteEncounterAudio(input: {
  encounterId: string;
  patientId: string;
  storagePath: string;
  awsInputKey?: string | null;
  actorUid?: string | null;
  reason?: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { error: storageError } = await supabase.storage
    .from(ENCOUNTER_AUDIO_BUCKET)
    .remove([input.storagePath]);

  if (storageError) {
    throw new Error(`Supabase audio deletion failed: ${storageError.message}`);
  }

  if (input.awsInputKey) {
    await deleteHealthScribeInputObject(input.awsInputKey);
  }

  await updateEncounter(input.encounterId, {
    audio_storage_path: null,
    audio_mime_type: null,
    audio_deleted_at: new Date().toISOString(),
  });

  await appendEncounterAuditLog({
    encounterId: input.encounterId,
    action: 'audio_deleted',
    actorUid: input.actorUid,
    metadata: {
      patientId: input.patientId,
      storagePath: input.storagePath,
      awsInputKey: input.awsInputKey ?? null,
      reason: input.reason ?? 'post_transcription_purge',
    },
  });
}

export async function runEncounterTranscriptionPipeline(
  rawInput: StartEncounterTranscriptionInput
): Promise<TranscriptionPipelineResult> {
  const input = startEncounterTranscriptionSchema.parse(rawInput);
  const encounterRow = await getEncounterRow(input.encounterId);
  const encounter = mapClinicEncounterRow(encounterRow);

  if (!encounter.audioStoragePath) {
    throw new Error('Encounter has no uploaded audio to transcribe.');
  }

  if (encounter.audioDeletedAt) {
    throw new Error('Encounter audio has already been deleted.');
  }

  if (encounter.audioExpiresAt && new Date(encounter.audioExpiresAt).getTime() <= Date.now()) {
    await updateEncounter(encounter.id, {
      status: 'failed',
      failure_reason: 'Raw audio expired before transcription could start.',
    });
    await appendEncounterAuditLog({
      encounterId: encounter.id,
      action: 'audio_expired',
      actorUid: input.actorUid,
    });
    throw new Error('Encounter audio retention window has expired.');
  }

  if (encounter.status !== 'draft' && encounter.status !== 'failed') {
    throw new Error(`Encounter status "${encounter.status}" cannot start transcription.`);
  }

  const startedAt = new Date().toISOString();
  await updateEncounter(encounter.id, {
    status: 'processing',
    started_at: startedAt,
    failure_reason: null,
    healthscribe_job_id: null,
    healthscribe_job_status: 'STARTING',
  });

  await appendEncounterAuditLog({
    encounterId: encounter.id,
    action: 'transcription_started',
    actorUid: input.actorUid,
    metadata: {
      storagePath: encounter.audioStoragePath,
      healthScribeConfigured: isHealthScribeConfigured(),
    },
  });

  const awsInputKey = `${encounter.patientId}/${encounter.id}/input.audio`;

  try {
    const audioBuffer = await downloadEncounterAudio(encounter.audioStoragePath);
    const staged = await uploadHealthScribeInputObject({
      key: awsInputKey,
      body: audioBuffer,
      contentType: encounter.audioMimeType ?? 'audio/webm',
    });

    const job = await startHealthScribeJob({
      jobName: `encounter-${encounter.id}`,
      inputS3Uri: staged.uri,
      outputS3KeyPrefix: `${encounter.patientId}/${encounter.id}/`,
    });

    await updateEncounter(encounter.id, {
      healthscribe_job_id: job.jobId,
      healthscribe_job_status: job.status,
    });

    const result = await waitForHealthScribeJob(job.jobId);

    const supabase = createAdminClient();
    const { data: transcriptRow, error: transcriptError } = await withSupabaseRetry(async () =>
      supabase
        .from('clinic_encounter_transcripts')
        .upsert(
          {
            encounter_id: encounter.id,
            transcript_text: result.transcriptText,
            structured_note: result.structuredNote,
            speaker_segments: result.speakerSegments,
            clinical_entities: result.clinicalEntities,
            model_id: result.modelId,
            model_version: result.modelVersion,
          },
          { onConflict: 'encounter_id' }
        )
        .select('id')
        .single()
    );

    if (transcriptError || !transcriptRow) {
      throw new Error(transcriptError?.message ?? 'Unable to persist encounter transcript.');
    }

    const completedAt = new Date().toISOString();
    await updateEncounter(encounter.id, {
      status: 'review',
      completed_at: completedAt,
      healthscribe_job_status: result.status,
      failure_reason: null,
    });

    await appendEncounterAuditLog({
      encounterId: encounter.id,
      action: 'transcription_completed',
      actorUid: input.actorUid,
      metadata: {
        healthscribeJobId: result.jobId,
        transcriptId: (transcriptRow as { id: string }).id,
      },
    });

    await deleteEncounterAudio({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      storagePath: encounter.audioStoragePath,
      awsInputKey,
      actorUid: input.actorUid,
      reason: 'post_transcription_purge',
    });

    return {
      encounterId: encounter.id,
      status: 'review',
      transcriptId: (transcriptRow as { id: string }).id,
      healthscribeJobId: result.jobId,
      audioDeleted: true,
      dryRun: !isHealthScribeConfigured(),
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Transcription pipeline failed.';

    await updateEncounter(encounter.id, {
      status: 'failed',
      failure_reason: message,
      healthscribe_job_status: 'FAILED',
    });

    await appendEncounterAuditLog({
      encounterId: encounter.id,
      action: 'transcription_failed',
      actorUid: input.actorUid,
      metadata: { error: message },
    });

    throw caught instanceof Error ? caught : new Error(message);
  }
}
