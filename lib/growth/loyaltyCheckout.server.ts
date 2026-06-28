import 'server-only';

import { applySubtotalDiscount, validatePointsRedemption } from '../business/loyalty';
import type { PricedCartItem } from '../firebase/orders.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import { getModuleFlags } from '../firebase/modules.server';
import { isModuleEnabled } from '../modules/flags';

export class LoyaltyRedemptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoyaltyRedemptionError';
  }
}

export async function applyLoyaltyRedemptionToCart(params: {
  userId: string | null;
  items: PricedCartItem[];
  subtotal: number;
  pointsToRedeem?: number;
}): Promise<{
  items: PricedCartItem[];
  subtotal: number;
  pointsRedeemed: number;
  loyaltyDiscount: number;
}> {
  const pointsToRedeem = params.pointsToRedeem ?? 0;
  if (pointsToRedeem <= 0) {
    return {
      items: params.items,
      subtotal: params.subtotal,
      pointsRedeemed: 0,
      loyaltyDiscount: 0,
    };
  }

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isLoyaltyRedemptionEnabled')) {
    throw new LoyaltyRedemptionError('Loyalty redemption is not enabled');
  }

  if (!params.userId || !isAdminSdkConfigured()) {
    throw new LoyaltyRedemptionError('Sign in to redeem loyalty points');
  }

  const db = getAdminFirestore();
  const userSnap = await db.collection('users').doc(params.userId).get();
  const availablePoints = Number(userSnap.data()?.loyaltyPoints ?? 0);

  const validation = validatePointsRedemption({
    pointsToRedeem,
    availablePoints,
    subtotal: params.subtotal,
  });

  if (!validation.ok) {
    throw new LoyaltyRedemptionError(validation.message);
  }

  const discountedItems = applySubtotalDiscount(params.items, params.subtotal, validation.discount);
  const newSubtotal = discountedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items: discountedItems,
    subtotal: Math.round(newSubtotal * 100) / 100,
    pointsRedeemed: pointsToRedeem,
    loyaltyDiscount: validation.discount,
  };
}
