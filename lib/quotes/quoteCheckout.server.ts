import 'server-only';

import type { PricedCartItem } from '../firebase/orders.server';
import { getQuoteById } from '../firebase/quotes.server';
import type { QuoteDocument } from '../schemas/quote';

export class QuoteCheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuoteCheckoutError';
  }
}

export function quoteToPricedCartItems(quote: QuoteDocument): PricedCartItem[] {
  return quote.lineItems.map((line) => ({
    id: line.productId,
    slug: line.productId,
    name: line.name,
    tag: line.tag,
    price: line.unitPrice,
    unitPrice: line.unitPrice,
    stock: 99,
    desc: '',
    purity: 'Research Grade',
    quantity: line.quantity,
  }));
}

export async function loadQuoteForCheckout(params: {
  quoteId: string;
  userId: string | null;
  email: string | null;
}): Promise<{ quote: QuoteDocument & { id: string }; items: PricedCartItem[] }> {
  const quote = await getQuoteById(params.quoteId);
  if (!quote) {
    throw new QuoteCheckoutError('Quote not found.');
  }

  if (!['sent', 'accepted'].includes(quote.status)) {
    throw new QuoteCheckoutError('This quote is not available for checkout.');
  }

  if (new Date(quote.validUntil).getTime() < Date.now()) {
    throw new QuoteCheckoutError('This quote has expired.');
  }

  const emailMatch =
    params.email &&
    quote.customerEmail.toLowerCase() === params.email.trim().toLowerCase();
  const userMatch = params.userId && quote.customerUserId === params.userId;

  if (!emailMatch && !userMatch) {
    throw new QuoteCheckoutError('Sign in with the quoted institution email to continue.');
  }

  return {
    quote,
    items: quoteToPricedCartItems(quote),
  };
}
