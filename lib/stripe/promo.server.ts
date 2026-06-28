import 'server-only';

import { getStripe } from './server';

export class PromoCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromoCodeError';
  }
}

export async function resolvePromotionCodeId(promoCode: string): Promise<string | null> {
  const code = promoCode.trim();
  if (!code) return null;

  const stripe = getStripe();
  const matches = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
  const promotion = matches.data[0];
  if (!promotion) {
    throw new PromoCodeError('Promo code is invalid or expired.');
  }

  return promotion.id;
}
