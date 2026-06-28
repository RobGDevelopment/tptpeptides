import { NextResponse } from 'next/server';
import { assertCronAuthorized, CronAuthError } from '../../../../lib/cron/authorize.server';
import { syncPeriodToQuickBooks } from '../../../../lib/finance/qboSync.server';

export const dynamic = 'force-dynamic';

/** Monthly headless QuickBooks sync — aggregates native journal_entries for the period. */
async function runAccountingSync(request: Request) {
  assertCronAuthorized(request);

  let period: string | undefined;
  try {
    const body = (await request.json()) as { period?: string };
    period = body.period;
  } catch {
    period = undefined;
  }

  const targetPeriod = period ?? previousCalendarMonth();
  return syncPeriodToQuickBooks(targetPeriod);
}

function previousCalendarMonth(): string {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

export async function GET(request: Request) {
  try {
    const result = await runAccountingSync(request);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[cron/accounting-sync] failed', error);
    return NextResponse.json({ error: 'Accounting sync job failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const result = await runAccountingSync(request);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[cron/accounting-sync] failed', error);
    return NextResponse.json({ error: 'Accounting sync job failed' }, { status: 500 });
  }
}
