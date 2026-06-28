import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { countActiveCartSnapshots, listAbandonedCartCandidates } from '../../../../lib/firebase/cartSnapshots.server';
import { findReplenishmentCandidates } from '../../../../lib/firebase/replenishment.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();

    const growthEnabled =
      isModuleEnabled(flags, 'isAbandonedCartEnabled') ||
      isModuleEnabled(flags, 'isPredictiveReplenishmentEnabled') ||
      isModuleEnabled(flags, 'isLoyaltyRedemptionEnabled');

    if (!growthEnabled) {
      return NextResponse.json({ error: 'Growth modules are disabled' }, { status: 404 });
    }

    const [activeCarts, abandonedReady, replenishmentCandidates] = await Promise.all([
      isModuleEnabled(flags, 'isAbandonedCartEnabled') ? countActiveCartSnapshots() : Promise.resolve(0),
      isModuleEnabled(flags, 'isAbandonedCartEnabled')
        ? listAbandonedCartCandidates(10)
        : Promise.resolve([]),
      isModuleEnabled(flags, 'isPredictiveReplenishmentEnabled')
        ? findReplenishmentCandidates(10)
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      flags: {
        abandonedCart: isModuleEnabled(flags, 'isAbandonedCartEnabled'),
        replenishment: isModuleEnabled(flags, 'isPredictiveReplenishmentEnabled'),
        loyaltyRedemption: isModuleEnabled(flags, 'isLoyaltyRedemptionEnabled'),
        transactionalEmail: isModuleEnabled(flags, 'isTransactionalEmailEnabled'),
      },
      activeCarts,
      abandonedReady,
      replenishmentCandidates,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to load growth metrics' }, { status: 500 });
  }
}
