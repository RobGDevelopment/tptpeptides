/** Points required for $1 catalog discount at checkout. */
export const LOYALTY_POINTS_PER_DOLLAR = 100;

export const calculateUserTier = (totalPoints: number) => {
  if (totalPoints > 5000) return 'Gold';
  if (totalPoints > 1000) return 'Silver';
  return 'Bronze';
};

export const calculatePointsForPurchase = (dollarAmount: number) => {
  return Math.floor(dollarAmount * 10);
};

export function dollarsFromPoints(points: number): number {
  return Math.round((points / LOYALTY_POINTS_PER_DOLLAR) * 100) / 100;
}

export function maxRedeemablePoints(params: {
  availablePoints: number;
  subtotal: number;
}): number {
  const maxBySubtotal = Math.floor(params.subtotal * LOYALTY_POINTS_PER_DOLLAR);
  return Math.max(0, Math.min(params.availablePoints, maxBySubtotal));
}

export function validatePointsRedemption(params: {
  pointsToRedeem: number;
  availablePoints: number;
  subtotal: number;
}): { ok: true; discount: number } | { ok: false; message: string } {
  if (params.pointsToRedeem <= 0) {
    return { ok: true, discount: 0 };
  }

  if (params.pointsToRedeem % 10 !== 0) {
    return { ok: false, message: 'Redeem loyalty points in increments of 10.' };
  }

  const maxPoints = maxRedeemablePoints(params);
  if (params.pointsToRedeem > maxPoints) {
    return { ok: false, message: 'Insufficient loyalty points for this order.' };
  }

  return { ok: true, discount: dollarsFromPoints(params.pointsToRedeem) };
}

export function applySubtotalDiscount<T extends { price: number; quantity: number }>(
  items: T[],
  subtotal: number,
  discountDollars: number
): T[] {
  if (discountDollars <= 0 || subtotal <= 0) return items;

  const ratio = Math.max(0, 1 - discountDollars / subtotal);
  return items.map((item) => ({
    ...item,
    price: Math.round(item.price * ratio * 100) / 100,
  }));
}
