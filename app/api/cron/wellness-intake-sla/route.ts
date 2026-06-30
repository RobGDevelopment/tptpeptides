import { NextResponse } from 'next/server';
import { assertCronAuthorized, CronAuthError } from '../../../../lib/cron/authorize.server';
import { sendWellnessSlaAlertEmail } from '../../../../lib/email/wellnessSlaAlert.server';
import {
  listStaleMedicalIntakes,
  markIntakesSlaAlerted,
} from '../../../../lib/wellness/intakeSla.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertCronAuthorized(request);

    const staleIntakes = await listStaleMedicalIntakes(24);
    const sent = await sendWellnessSlaAlertEmail(staleIntakes);

    if (sent && staleIntakes.length > 0) {
      await markIntakesSlaAlerted(staleIntakes.map((intake) => intake.id));
    }

    return NextResponse.json({
      ok: true,
      stale: staleIntakes.length,
      emailed: sent,
    });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[cron/wellness-intake-sla] failed', error);
    return NextResponse.json({ error: 'Wellness intake SLA job failed' }, { status: 500 });
  }
}
