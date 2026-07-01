import { NextResponse } from 'next/server';
import { syncClinicLedgerToQuickBooks } from '../../../../lib/clinic/finance/clinicAccountingSync.server';
import { assertCronAuthorized, CronAuthError } from '../../../../lib/cron/authorize.server';

export const dynamic = 'force-dynamic';

/** Monthly clinic clearing ledger → QuickBooks sync for pending QBO queue rows. */
async function runClinicAccountingSync(request: Request) {
  assertCronAuthorized(request);

  let period: string | undefined;
  try {
    const body = (await request.json()) as { period?: string };
    period = body.period;
  } catch {
    period = undefined;
  }

  return syncClinicLedgerToQuickBooks(period);
}

function previousCalendarMonth(): string {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

export async function GET(request: Request) {
  try {
    const result = await runClinicAccountingSync(request);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[cron/clinic-accounting-sync] failed', error);
    return NextResponse.json({ error: 'Clinic accounting sync job failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const result = await runClinicAccountingSync(request);
    return NextResponse.json({
      ok: true,
      defaultPeriod: previousCalendarMonth(),
      ...result,
    });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[cron/clinic-accounting-sync] failed', error);
    return NextResponse.json({ error: 'Clinic accounting sync job failed' }, { status: 500 });
  }
}
