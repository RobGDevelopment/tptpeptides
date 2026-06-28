import { NextResponse } from 'next/server';
import { assertCronAuthorized, CronAuthError } from '../../../../lib/cron/authorize.server';
import {
  listAbandonedCartCandidates,
  markAbandonedCartEmailSent,
} from '../../../../lib/firebase/cartSnapshots.server';
import { sendAbandonedCartEmail } from '../../../../lib/email/growth.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertCronAuthorized(request);
    const flags = await getModuleFlags();
    if (!isModuleEnabled(flags, 'isAbandonedCartEnabled')) {
      return NextResponse.json({ ok: true, sent: 0, skipped: true });
    }

    const candidates = await listAbandonedCartCandidates(25);
    let sent = 0;

    for (const candidate of candidates) {
      const delivered = await sendAbandonedCartEmail({
        email: candidate.email,
        recoveryToken: candidate.recoveryToken,
        itemCount: candidate.items.length,
        subtotal: candidate.subtotal,
      });
      if (delivered) {
        await markAbandonedCartEmailSent(candidate.id);
        sent += 1;
      }
    }

    return NextResponse.json({ ok: true, sent, candidates: candidates.length });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[cron/abandoned-carts] failed', error);
    return NextResponse.json({ error: 'Abandoned cart job failed' }, { status: 500 });
  }
}
