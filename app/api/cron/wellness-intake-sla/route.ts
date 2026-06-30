import { NextResponse } from 'next/server';
import { processIntakeSlaViolations } from '../../../../lib/wellness/intakeSla.server';

export const dynamic = 'force-dynamic';

async function runWellnessIntakeSlaCron(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await processIntakeSlaViolations(24);

  return NextResponse.json({
    ok: true,
    stale: result.staleCount,
    emailed: result.emailed,
    marked: result.markedCount,
  });
}

/** Vercel Cron invokes GET on the scheduled path. */
export async function GET(request: Request) {
  try {
    const response = await runWellnessIntakeSlaCron(request);
    if (response.status === 401) {
      return response;
    }
    return response;
  } catch (error) {
    console.error('[cron/wellness-intake-sla] failed', error);
    return NextResponse.json({ error: 'Wellness intake SLA job failed' }, { status: 500 });
  }
}

/** Manual / CI trigger (e.g. npm run test:clinic-sla). */
export async function POST(request: Request) {
  return GET(request);
}
