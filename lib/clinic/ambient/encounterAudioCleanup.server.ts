import 'server-only';

import { createAdminClient } from '../../supabase/admin';
import { withSupabaseRetry } from '../../supabase/retry.server';
import { deleteEncounterAudio } from './transcribePipeline.server';

export type EncounterAudioCleanupResult = {
  markedExpired: number;
  purged: number;
  errors: string[];
};

type ExpiredEncounterRow = {
  id: string;
  patient_id: string;
  audio_storage_path: string;
};

async function loadExpiredAudioEncounters(): Promise<ExpiredEncounterRow[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await withSupabaseRetry(async () =>
    supabase
      .from('clinic_encounters')
      .select('id, patient_id, audio_storage_path')
      .not('audio_storage_path', 'is', null)
      .is('audio_deleted_at', null)
      .not('audio_expires_at', 'is', null)
      .lte('audio_expires_at', now)
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ExpiredEncounterRow[];
}

/**
 * HIPAA retention enforcement:
 * 1. Mark TTL-expired draft encounters via DB helper
 * 2. Purge any remaining storage objects for expired audio paths
 */
export async function cleanupExpiredEncounterAudio(): Promise<EncounterAudioCleanupResult> {
  const supabase = createAdminClient();
  const errors: string[] = [];

  const { data: markedCount, error: rpcError } = await withSupabaseRetry(async () =>
    supabase.rpc('clinic_encounters_mark_expired_audio')
  );

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const expiredRows = await loadExpiredAudioEncounters();
  let purged = 0;

  for (const row of expiredRows) {
    try {
      await deleteEncounterAudio({
        encounterId: row.id,
        patientId: row.patient_id,
        storagePath: row.audio_storage_path,
        reason: 'ttl_expired_cleanup',
      });
      purged += 1;
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unknown audio cleanup failure.';
      errors.push(`encounter ${row.id}: ${message}`);
    }
  }

  return {
    markedExpired: typeof markedCount === 'number' ? markedCount : 0,
    purged,
    errors,
  };
}
