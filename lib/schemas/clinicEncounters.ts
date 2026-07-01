import { z } from 'zod';

export const clinicEncounterStatusSchema = z.enum([
  'draft',
  'processing',
  'review',
  'finalized',
  'failed',
]);

export type ClinicEncounterStatus = z.infer<typeof clinicEncounterStatusSchema>;

export const clinicEncounterAuditActionSchema = z.enum([
  'encounter_created',
  'audio_uploaded',
  'transcription_started',
  'transcription_completed',
  'audio_deleted',
  'transcription_failed',
  'encounter_finalized',
  'audio_expired',
]);

export type ClinicEncounterAuditAction = z.infer<typeof clinicEncounterAuditActionSchema>;

export const speakerSegmentSchema = z.object({
  speakerLabel: z.string().min(1).max(64),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  text: z.string().min(1),
});

export type SpeakerSegment = z.infer<typeof speakerSegmentSchema>;

export const structuredClinicalNoteSchema = z.object({
  summary: z.string().optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  sections: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
    })
  ).optional(),
});

export type StructuredClinicalNote = z.infer<typeof structuredClinicalNoteSchema>;

export const clinicalEntitySchema = z.object({
  category: z.string().min(1).max(120),
  text: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

export type ClinicalEntity = z.infer<typeof clinicalEntitySchema>;

export const createClinicEncounterInputSchema = z.object({
  patientId: z.string().uuid(),
  providerUid: z.string().min(1).max(128).optional().nullable(),
  medicalIntakeId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200).default('Telehealth encounter'),
  audioExpiresInHours: z.number().int().min(1).max(168).default(24),
});

export type CreateClinicEncounterInput = z.infer<typeof createClinicEncounterInputSchema>;

export const startEncounterTranscriptionSchema = z.object({
  encounterId: z.string().uuid(),
  actorUid: z.string().min(1).max(128).optional().nullable(),
});

export type StartEncounterTranscriptionInput = z.infer<typeof startEncounterTranscriptionSchema>;

export const clinicEncounterRowSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  provider_uid: z.string().nullable(),
  medical_intake_id: z.string().uuid().nullable(),
  status: clinicEncounterStatusSchema,
  title: z.string(),
  audio_storage_path: z.string().nullable(),
  audio_mime_type: z.string().nullable(),
  audio_expires_at: z.string().datetime().nullable(),
  audio_deleted_at: z.string().datetime().nullable(),
  healthscribe_job_id: z.string().nullable(),
  healthscribe_job_status: z.string().nullable(),
  failure_reason: z.string().nullable(),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ClinicEncounterRow = z.infer<typeof clinicEncounterRowSchema>;

export const clinicEncounterTranscriptRowSchema = z.object({
  id: z.string().uuid(),
  encounter_id: z.string().uuid(),
  transcript_text: z.string(),
  structured_note: structuredClinicalNoteSchema.or(z.record(z.string(), z.unknown())),
  speaker_segments: z.array(speakerSegmentSchema).or(z.array(z.unknown())),
  clinical_entities: z.array(clinicalEntitySchema).or(z.array(z.unknown())),
  model_id: z.string().nullable(),
  model_version: z.string().nullable(),
  created_at: z.string().datetime(),
});

export type ClinicEncounterTranscriptRow = z.infer<typeof clinicEncounterTranscriptRowSchema>;

export const clinicEncounterAuditLogRowSchema = z.object({
  id: z.string().uuid(),
  encounter_id: z.string().uuid(),
  action: z.string(),
  actor_uid: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
});

export type ClinicEncounterAuditLogRow = z.infer<typeof clinicEncounterAuditLogRowSchema>;

export type ClinicEncounter = {
  id: string;
  patientId: string;
  providerUid: string | null;
  medicalIntakeId: string | null;
  status: ClinicEncounterStatus;
  title: string;
  audioStoragePath: string | null;
  audioMimeType: string | null;
  audioExpiresAt: string | null;
  audioDeletedAt: string | null;
  healthscribeJobId: string | null;
  healthscribeJobStatus: string | null;
  failureReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClinicEncounterTranscript = {
  id: string;
  encounterId: string;
  transcriptText: string;
  structuredNote: StructuredClinicalNote;
  speakerSegments: SpeakerSegment[];
  clinicalEntities: ClinicalEntity[];
  modelId: string | null;
  modelVersion: string | null;
  createdAt: string;
};

export function mapClinicEncounterRow(row: ClinicEncounterRow): ClinicEncounter {
  return {
    id: row.id,
    patientId: row.patient_id,
    providerUid: row.provider_uid,
    medicalIntakeId: row.medical_intake_id,
    status: row.status,
    title: row.title,
    audioStoragePath: row.audio_storage_path,
    audioMimeType: row.audio_mime_type,
    audioExpiresAt: row.audio_expires_at,
    audioDeletedAt: row.audio_deleted_at,
    healthscribeJobId: row.healthscribe_job_id,
    healthscribeJobStatus: row.healthscribe_job_status,
    failureReason: row.failure_reason,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClinicEncounterTranscriptRow(
  row: ClinicEncounterTranscriptRow
): ClinicEncounterTranscript {
  const structuredParsed = structuredClinicalNoteSchema.safeParse(row.structured_note);
  const segmentsParsed = z.array(speakerSegmentSchema).safeParse(row.speaker_segments);
  const entitiesParsed = z.array(clinicalEntitySchema).safeParse(row.clinical_entities);

  return {
    id: row.id,
    encounterId: row.encounter_id,
    transcriptText: row.transcript_text,
    structuredNote: structuredParsed.success ? structuredParsed.data : {},
    speakerSegments: segmentsParsed.success ? segmentsParsed.data : [],
    clinicalEntities: entitiesParsed.success ? entitiesParsed.data : [],
    modelId: row.model_id,
    modelVersion: row.model_version,
    createdAt: row.created_at,
  };
}

export const ENCOUNTER_AUDIO_BUCKET = 'clinic_encounters_audio' as const;

export function buildEncounterAudioStoragePath(input: {
  patientId: string;
  encounterId: string;
  extension: string;
}): string {
  const safeExtension = input.extension.replace(/^\./, '').toLowerCase();
  return `${input.patientId}/${input.encounterId}/recording.${safeExtension}`;
}
