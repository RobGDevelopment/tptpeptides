/** Flat-rate research shipping estimates (USD). */
export const SHIPPING_FLAT_RATE = 12.99;
export const COLD_CHAIN_SURCHARGE = 8.5;

export function estimateShipping(itemCount: number, hasColdChainItems = true): number {
  if (itemCount <= 0) return 0;
  const base = SHIPPING_FLAT_RATE;
  const coldChain = hasColdChainItems ? COLD_CHAIN_SURCHARGE : 0;
  return Math.round((base + coldChain) * 100) / 100;
}
