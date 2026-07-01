import 'server-only';

import {
  GetMedicalScribeJobCommand,
  MedicalScribeJobStatus,
  StartMedicalScribeJobCommand,
  TranscribeClient,
  type MedicalScribeSettings,
} from '@aws-sdk/client-transcribe';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type {
  ClinicalEntity,
  SpeakerSegment,
  StructuredClinicalNote,
} from '../../schemas/clinicEncounters';

export type HealthScribeConfig = {
  region: string;
  inputBucket: string;
  outputBucket: string;
  dataAccessRoleArn: string;
  dryRun: boolean;
};

export type HealthScribeJobResult = {
  jobId: string;
  status: string;
  transcriptText: string;
  structuredNote: StructuredClinicalNote;
  speakerSegments: SpeakerSegment[];
  clinicalEntities: ClinicalEntity[];
  modelId: string;
  modelVersion: string;
};

export type StartHealthScribeJobInput = {
  jobName: string;
  inputS3Uri: string;
  outputS3KeyPrefix: string;
};

function readConfig(): HealthScribeConfig | null {
  const region = process.env.AWS_HEALTHSCRIBE_REGION?.trim() || process.env.AWS_REGION?.trim();
  const inputBucket = process.env.AWS_HEALTHSCRIBE_INPUT_BUCKET?.trim();
  const outputBucket = process.env.AWS_HEALTHSCRIBE_OUTPUT_BUCKET?.trim();
  const dataAccessRoleArn = process.env.AWS_HEALTHSCRIBE_DATA_ACCESS_ROLE_ARN?.trim();
  const dryRun =
    process.env.AWS_HEALTHSCRIBE_DRY_RUN?.trim().toLowerCase() === 'true' ||
    !region ||
    !inputBucket ||
    !outputBucket ||
    !dataAccessRoleArn;

  if (dryRun) {
    return {
      region: region || 'us-east-1',
      inputBucket: inputBucket || 'dry-run-input',
      outputBucket: outputBucket || 'dry-run-output',
      dataAccessRoleArn: dataAccessRoleArn || 'arn:aws:iam::000000000000:role/dry-run',
      dryRun: true,
    };
  }

  return { region, inputBucket, outputBucket, dataAccessRoleArn, dryRun: false };
}

function createTranscribeClient(region: string): TranscribeClient {
  return new TranscribeClient({ region });
}

function createS3Client(region: string): S3Client {
  return new S3Client({ region });
}

export function isHealthScribeConfigured(): boolean {
  const config = readConfig();
  return Boolean(config && !config.dryRun);
}

export async function uploadHealthScribeInputObject(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ bucket: string; uri: string }> {
  const config = readConfig();
  if (!config) {
    throw new Error('AWS HealthScribe is not configured.');
  }

  if (config.dryRun) {
    return {
      bucket: config.inputBucket,
      uri: `s3://${config.inputBucket}/${input.key}`,
    };
  }

  const s3 = createS3Client(config.region);
  await s3.send(
    new PutObjectCommand({
      Bucket: config.inputBucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ServerSideEncryption: 'aws:kms',
    })
  );

  return {
    bucket: config.inputBucket,
    uri: `s3://${config.inputBucket}/${input.key}`,
  };
}

export async function deleteHealthScribeInputObject(key: string): Promise<void> {
  const config = readConfig();
  if (!config || config.dryRun) return;

  const s3 = createS3Client(config.region);
  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.inputBucket,
      Key: key,
    })
  );
}

export async function startHealthScribeJob(
  input: StartHealthScribeJobInput
): Promise<{ jobId: string; status: string }> {
  const config = readConfig();
  if (!config) {
    throw new Error('AWS HealthScribe is not configured.');
  }

  if (config.dryRun) {
    return {
      jobId: `dry-run-${input.jobName}`,
      status: MedicalScribeJobStatus.COMPLETED,
    };
  }

  const client = createTranscribeClient(config.region);
  const settings: MedicalScribeSettings = {
    ShowSpeakerLabels: true,
    MaxSpeakerLabels: 2,
  };

  const response = await client.send(
    new StartMedicalScribeJobCommand({
      MedicalScribeJobName: input.jobName,
      Media: {
        MediaFileUri: input.inputS3Uri,
      },
      OutputBucketName: config.outputBucket,
      DataAccessRoleArn: config.dataAccessRoleArn,
      Settings: settings,
      Tags: [
        { Key: 'outputPrefix', Value: input.outputS3KeyPrefix },
      ],
    })
  );

  const jobId = response.MedicalScribeJob?.MedicalScribeJobName;
  if (!jobId) {
    throw new Error('HealthScribe did not return a job id.');
  }

  return {
    jobId,
    status: response.MedicalScribeJob?.MedicalScribeJobStatus ?? MedicalScribeJobStatus.QUEUED,
  };
}

async function readOutputJson(config: HealthScribeConfig, key: string): Promise<unknown> {
  const s3 = createS3Client(config.region);
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: config.outputBucket,
      Key: key,
    })
  );

  const body = await response.Body?.transformToString('utf8');
  if (!body) {
    throw new Error('HealthScribe output object was empty.');
  }

  return JSON.parse(body) as unknown;
}

function buildDryRunResult(jobId: string): HealthScribeJobResult {
  return {
    jobId,
    status: MedicalScribeJobStatus.COMPLETED,
    transcriptText:
      'Patient reports improved energy and adherence to the prescribed longevity protocol. No acute concerns discussed.',
    structuredNote: {
      summary: 'Follow-up telehealth visit for longevity protocol monitoring.',
      subjective: 'Patient reports improved energy levels and medication adherence.',
      objective: 'Review conducted via secure synchronous video visit.',
      assessment: 'Stable on current protocol; continue current plan.',
      plan: 'Repeat labs in 90 days; maintain current supplement and hormone regimen.',
    },
    speakerSegments: [
      {
        speakerLabel: 'CLINICIAN',
        startMs: 0,
        endMs: 15000,
        text: 'How have you been feeling on the current protocol?',
      },
      {
        speakerLabel: 'PATIENT',
        startMs: 15000,
        endMs: 32000,
        text: 'Energy is better and I have been consistent with the plan.',
      },
    ],
    clinicalEntities: [
      { category: 'MEDICATION', text: 'longevity protocol', confidence: 0.91 },
    ],
    modelId: 'aws.healthscribe.dry-run',
    modelVersion: '2026-06',
  };
}

function parseHealthScribeOutput(payload: unknown): Omit<HealthScribeJobResult, 'jobId' | 'status'> {
  const root = payload as Record<string, unknown>;
  const conversation = (root.Conversation ?? root.conversation ?? {}) as Record<string, unknown>;
  const transcriptBlocks = (conversation.TranscriptSegments ??
    conversation.transcriptSegments ??
    []) as Array<Record<string, unknown>>;

  const speakerSegments: SpeakerSegment[] = transcriptBlocks
    .map((segment) => ({
      speakerLabel: String(segment.ParticipantRole ?? segment.speakerLabel ?? 'UNKNOWN'),
      startMs: Number(segment.BeginAudioTime ?? segment.startMs ?? 0),
      endMs: Number(segment.EndAudioTime ?? segment.endMs ?? 0),
      text: String(segment.Content ?? segment.text ?? '').trim(),
    }))
    .filter((segment) => segment.text.length > 0);

  const transcriptText = speakerSegments.map((segment) => segment.text).join('\n');

  const clinicalDocument = (root.ClinicalDocument ??
    root.clinicalDocument ??
    {}) as Record<string, unknown>;
  const sections = (clinicalDocument.Sections ?? clinicalDocument.sections ?? []) as Array<
    Record<string, unknown>
  >;

  const structuredNote: StructuredClinicalNote = {
    sections: sections.map((section) => ({
      name: String(section.SectionName ?? section.name ?? 'Section'),
      content: String(section.Summary ?? section.content ?? '').trim(),
    })),
  };

  for (const section of structuredNote.sections ?? []) {
    const normalized = section.name.toLowerCase();
    if (normalized.includes('subjective')) structuredNote.subjective = section.content;
    if (normalized.includes('objective')) structuredNote.objective = section.content;
    if (normalized.includes('assessment')) structuredNote.assessment = section.content;
    if (normalized.includes('plan')) structuredNote.plan = section.content;
    if (normalized.includes('summary')) structuredNote.summary = section.content;
  }

  const clinicalEntities: ClinicalEntity[] = sections.flatMap((section) => {
    const items = (section.ClinicalEntities ?? section.clinicalEntities ?? []) as Array<
      Record<string, unknown>
    >;
    return items.map((item) => ({
      category: String(item.Category ?? item.category ?? 'UNKNOWN'),
      text: String(item.Text ?? item.text ?? '').trim(),
      confidence:
        typeof item.Confidence === 'number'
          ? item.Confidence
          : typeof item.confidence === 'number'
            ? item.confidence
            : undefined,
    }));
  }).filter((entity) => entity.text.length > 0);

  return {
    transcriptText: transcriptText || 'Transcription completed.',
    structuredNote,
    speakerSegments,
    clinicalEntities,
    modelId: String(root.ModelId ?? root.modelId ?? 'aws.healthscribe'),
    modelVersion: String(root.ModelVersion ?? root.modelVersion ?? 'unknown'),
  };
}

export async function waitForHealthScribeJob(
  jobId: string,
  options: { maxAttempts?: number; delayMs?: number } = {}
): Promise<HealthScribeJobResult> {
  const config = readConfig();
  if (!config) {
    throw new Error('AWS HealthScribe is not configured.');
  }

  if (config.dryRun) {
    return buildDryRunResult(jobId);
  }

  const maxAttempts = options.maxAttempts ?? 30;
  const delayMs = options.delayMs ?? 4000;
  const client = createTranscribeClient(config.region);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await client.send(
      new GetMedicalScribeJobCommand({
        MedicalScribeJobName: jobId,
      })
    );

    const job = response.MedicalScribeJob;
    const status = job?.MedicalScribeJobStatus ?? MedicalScribeJobStatus.QUEUED;

    if (status === MedicalScribeJobStatus.COMPLETED) {
      const outputKey = job?.MedicalScribeOutput?.ClinicalDocumentUri?.split('/').slice(3).join('/');
      const transcriptKey =
        outputKey ??
        job?.MedicalScribeOutput?.TranscriptFileUri?.split('/').slice(3).join('/') ??
        `${jobId}/clinical-document.json`;

      const payload = await readOutputJson(config, transcriptKey);
      const parsed = parseHealthScribeOutput(payload);

      return {
        jobId,
        status,
        ...parsed,
      };
    }

    if (status === MedicalScribeJobStatus.FAILED) {
      throw new Error(job?.FailureReason ?? 'HealthScribe job failed.');
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`HealthScribe job ${jobId} did not complete within the polling window.`);
}
