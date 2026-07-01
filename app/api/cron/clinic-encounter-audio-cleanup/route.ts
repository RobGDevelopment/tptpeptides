import { NextResponse } from 'next/server';
import { cleanupExpiredEncounterAudio } from '../../../../lib/clinic/ambient/encounterAudioCleanup.server';
import { assertCronAuthorized, CronAuthError } from '../../../../lib/cron/authorize.server';

export const dynamic = 'force-dynamic';

/** Purge TTL-expired encounter audio and mark stale draft encounters failed. */
async function runEncounterAudioCleanup(request: Request) {
  assertCronAuthorized(request);
  return cleanupExpiredEncounterAudio();
}

export async function GET(request: Request) {
  try {
    const result = await runEncounterAudioCleanup(request);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[cron/clinic-encounter-audio-cleanup] failed', error);
    return NextResponse.json({ error: 'Encounter audio cleanup job failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
