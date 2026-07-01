import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { withSupabaseRetry } from '../../../../../lib/supabase/retry.server';
import {
  buildEncounterAudioStoragePath,
  ENCOUNTER_AUDIO_BUCKET,
} from '../../../../../lib/schemas/clinicEncounters';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CHUNK_FOLDER = 'chunks';
const ALLOWED_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp4',
]);

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'webm';
}

function chunkStoragePath(patientId: string, encounterId: string, chunkIndex: number): string {
  return `${patientId}/${encounterId}/${CHUNK_FOLDER}/${String(chunkIndex).padStart(6, '0')}.part`;
}

async function appendEncounterAuditLog(input: {
  encounterId: string;
  action: string;
  actorUid: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();
  await withSupabaseRetry(async () =>
    supabase.from('clinic_encounter_audit_log').insert({
      encounter_id: input.encounterId,
      action: input.action,
      actor_uid: input.actorUid,
      metadata: input.metadata ?? {},
    })
  );
}

async function mergeEncounterAudioChunks(input: {
  patientId: string;
  encounterId: string;
  mimeType: string;
}): Promise<{ storagePath: string; bytes: number }> {
  const supabase = createAdminClient();
  const chunkPrefix = `${input.patientId}/${input.encounterId}/${CHUNK_FOLDER}/`;

  const { data: objects, error: listError } = await supabase.storage
    .from(ENCOUNTER_AUDIO_BUCKET)
    .list(`${input.patientId}/${input.encounterId}/${CHUNK_FOLDER}`, {
      limit: 500,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (listError) {
    throw new Error(listError.message);
  }

  const chunkNames = (objects ?? [])
    .map((object) => object.name)
    .filter((name): name is string => Boolean(name))
    .sort();

  if (chunkNames.length === 0) {
    throw new Error('No audio chunks were uploaded for this encounter.');
  }

  const buffers: Buffer[] = [];

  for (const chunkName of chunkNames) {
    const chunkPath = `${chunkPrefix}${chunkName}`;
    const { data, error } = await supabase.storage.from(ENCOUNTER_AUDIO_BUCKET).download(chunkPath);

    if (error || !data) {
      throw new Error(error?.message ?? `Unable to download chunk ${chunkName}.`);
    }

    buffers.push(Buffer.from(await data.arrayBuffer()));
  }

  const merged = Buffer.concat(buffers);
  const extension = extensionForMime(input.mimeType);
  const storagePath = buildEncounterAudioStoragePath({
    patientId: input.patientId,
    encounterId: input.encounterId,
    extension,
  });

  const { error: uploadError } = await supabase.storage
    .from(ENCOUNTER_AUDIO_BUCKET)
    .upload(storagePath, merged, {
      contentType: input.mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const chunkPaths = chunkNames.map((name) => `${chunkPrefix}${name}`);
  await supabase.storage.from(ENCOUNTER_AUDIO_BUCKET).remove(chunkPaths);

  return { storagePath, bytes: merged.byteLength };
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession(request);

    const flags = await getModuleFlags();
    if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
      return NextResponse.json({ error: 'Wellness module is not enabled.' }, { status: 403 });
    }

    const formData = await request.formData();
    const encounterId = formData.get('encounterId');
    const patientId = formData.get('patientId');
    const chunkIndexRaw = formData.get('chunkIndex');
    const isFinalRaw = formData.get('isFinal');
    const mimeTypeRaw = formData.get('mimeType');
    const chunk = formData.get('chunk');

    if (typeof encounterId !== 'string' || typeof patientId !== 'string') {
      return NextResponse.json({ error: 'encounterId and patientId are required.' }, { status: 400 });
    }

    const chunkIndex = Number.parseInt(String(chunkIndexRaw ?? '0'), 10);
    if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json({ error: 'Invalid chunkIndex.' }, { status: 400 });
    }

    const isFinal = String(isFinalRaw ?? 'false').toLowerCase() === 'true';
    const mimeType =
      typeof mimeTypeRaw === 'string' && ALLOWED_MIME_TYPES.has(mimeTypeRaw)
        ? mimeTypeRaw
        : 'audio/webm';

    const supabase = createAdminClient();
    const { data: encounter, error: encounterError } = await withSupabaseRetry(async () =>
      supabase
        .from('clinic_encounters')
        .select('id, patient_id, status, audio_deleted_at')
        .eq('id', encounterId)
        .eq('patient_id', patientId)
        .maybeSingle()
    );

    if (encounterError) {
      return NextResponse.json({ error: encounterError.message }, { status: 500 });
    }

    if (!encounter) {
      return NextResponse.json({ error: 'Encounter not found.' }, { status: 404 });
    }

    if (encounter.status !== 'draft' && encounter.status !== 'failed') {
      return NextResponse.json(
        { error: 'Audio can only be uploaded while the encounter is in draft.' },
        { status: 409 }
      );
    }

    if (encounter.audio_deleted_at) {
      return NextResponse.json({ error: 'Encounter audio has already been purged.' }, { status: 409 });
    }

    if (chunk instanceof File && chunk.size > 0) {
      const chunkPath = chunkStoragePath(patientId, encounterId, chunkIndex);
      const buffer = Buffer.from(await chunk.arrayBuffer());

      const { error: chunkUploadError } = await supabase.storage
        .from(ENCOUNTER_AUDIO_BUCKET)
        .upload(chunkPath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (chunkUploadError) {
        return NextResponse.json({ error: chunkUploadError.message }, { status: 500 });
      }
    }

    if (!isFinal) {
      return NextResponse.json({
        ok: true,
        encounterId,
        chunkIndex,
        received: chunk instanceof File ? chunk.size : 0,
      });
    }

    const merged = await mergeEncounterAudioChunks({
      patientId,
      encounterId,
      mimeType,
    });

    const audioExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await withSupabaseRetry(async () =>
      supabase
        .from('clinic_encounters')
        .update({
          audio_storage_path: merged.storagePath,
          audio_mime_type: mimeType,
          audio_expires_at: audioExpiresAt,
          status: 'draft',
          failure_reason: null,
        })
        .eq('id', encounterId)
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await appendEncounterAuditLog({
      encounterId,
      action: 'audio_uploaded',
      actorUid: admin.uid,
      metadata: {
        bytes: merged.bytes,
        mimeType,
        storagePath: merged.storagePath,
        chunkCount: chunkIndex + 1,
      },
    });

    return NextResponse.json({
      ok: true,
      encounterId,
      storagePath: merged.storagePath,
      bytes: merged.bytes,
      finalized: true,
    });
  } catch (caught) {
    if (caught instanceof AdminAuthError) {
      return NextResponse.json({ error: caught.message }, { status: caught.statusCode ?? 401 });
    }

    const message = caught instanceof Error ? caught.message : 'Audio upload failed.';
    console.error('[clinic/ambient/upload] failed', caught);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
