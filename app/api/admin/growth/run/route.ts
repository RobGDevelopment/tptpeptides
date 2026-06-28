import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { CronAuthError } from '../../../../../lib/cron/authorize.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

async function runCron(path: string, request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured on the server' }, { status: 503 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const data = (await response.json()) as Record<string, unknown>;
  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();

    let body: { job?: string };
    try {
      body = (await request.json()) as { job?: string };
    } catch {
      body = {};
    }

    if (body.job === 'abandoned-carts') {
      if (!isModuleEnabled(flags, 'isAbandonedCartEnabled')) {
        return NextResponse.json({ error: 'Abandoned cart module is disabled' }, { status: 404 });
      }
      return runCron('/api/cron/abandoned-carts', request);
    }
    if (body.job === 'replenishment') {
      if (!isModuleEnabled(flags, 'isPredictiveReplenishmentEnabled')) {
        return NextResponse.json({ error: 'Replenishment module is disabled' }, { status: 404 });
      }
      return runCron('/api/cron/replenishment', request);
    }

    return NextResponse.json({ error: 'Unknown growth job' }, { status: 400 });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Unable to run growth job' }, { status: 500 });
  }
}
