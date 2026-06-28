import { NextResponse } from 'next/server';
import { assertCronAuthorized, CronAuthError } from '../../../../lib/cron/authorize.server';
import { sendReplenishmentEmail } from '../../../../lib/email/growth.server';
import {
  findReplenishmentCandidates,
  recordReplenishmentEmail,
  wasReplenishmentEmailSentRecently,
} from '../../../../lib/firebase/replenishment.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertCronAuthorized(request);
    const flags = await getModuleFlags();
    if (!isModuleEnabled(flags, 'isPredictiveReplenishmentEnabled')) {
      return NextResponse.json({ ok: true, sent: 0, skipped: true });
    }

    const candidates = await findReplenishmentCandidates(25);
    let sent = 0;

    for (const candidate of candidates) {
      const recentlySent = await wasReplenishmentEmailSentRecently(
        candidate.userId,
        candidate.productId
      );
      if (recentlySent) continue;

      const delivered = await sendReplenishmentEmail({
        email: candidate.email,
        productName: candidate.productName,
        productTag: candidate.productTag,
        suggestedQuantity: candidate.suggestedQuantity,
      });

      if (delivered) {
        await recordReplenishmentEmail({
          userId: candidate.userId,
          productId: candidate.productId,
          email: candidate.email,
        });
        sent += 1;
      }
    }

    return NextResponse.json({ ok: true, sent, candidates: candidates.length });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[cron/replenishment] failed', error);
    return NextResponse.json({ error: 'Replenishment job failed' }, { status: 500 });
  }
}
