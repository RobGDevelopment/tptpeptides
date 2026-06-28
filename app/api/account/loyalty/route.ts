import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '../../../../lib/firebase/auth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { LOYALTY_POINTS_PER_DOLLAR, maxRedeemablePoints } from '../../../../lib/business/loyalty';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionUser = await getSessionUserFromRequest(request);
  if (!sessionUser?.uid) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const flags = await getModuleFlags();
  const redemptionEnabled = isModuleEnabled(flags, 'isLoyaltyRedemptionEnabled');

  if (!isAdminSdkConfigured()) {
    return NextResponse.json({
      loyaltyPoints: 0,
      redemptionEnabled,
      pointsPerDollar: LOYALTY_POINTS_PER_DOLLAR,
    });
  }

  const db = getAdminFirestore();
  const userSnap = await db.collection('users').doc(sessionUser.uid).get();
  const loyaltyPoints = Number(userSnap.data()?.loyaltyPoints ?? 0);

  return NextResponse.json({
    loyaltyPoints,
    redemptionEnabled,
    pointsPerDollar: LOYALTY_POINTS_PER_DOLLAR,
    maxRedeemablePoints: maxRedeemablePoints({ availablePoints: loyaltyPoints, subtotal: 999999 }),
  });
}
