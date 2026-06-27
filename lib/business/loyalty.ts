/**
 * Calculates user tier based on total loyalty points earned.
 * Used to automatically update customer rewards display in the dashboard.
 */
export const calculateUserTier = (totalPoints: number) => {
  if (totalPoints > 5000) return "Gold";
  if (totalPoints > 1000) return "Silver";
  return "Bronze";
};

/**
 * Calculates points to be awarded for a purchase.
 * Example: 10 points per dollar spent.
 */
export const calculatePointsForPurchase = (dollarAmount: number) => {
  return Math.floor(dollarAmount * 10);
};