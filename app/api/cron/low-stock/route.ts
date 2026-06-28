import { NextResponse } from 'next/server';
import { assertCronAuthorized, CronAuthError } from '../../../../lib/cron/authorize.server';
import { sendLowStockAlertEmail } from '../../../../lib/email/inventoryAlert.server';
import { listLowStockVariants } from '../../../../lib/firebase/inventoryAlerts.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertCronAuthorized(request);
    const variants = await listLowStockVariants();
    const sent = await sendLowStockAlertEmail(variants);
    return NextResponse.json({ ok: true, variants: variants.length, sent });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[cron/low-stock] failed', error);
    return NextResponse.json({ error: 'Low stock alert job failed' }, { status: 500 });
  }
}
