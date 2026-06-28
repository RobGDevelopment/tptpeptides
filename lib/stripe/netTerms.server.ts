import 'server-only';

import type Stripe from 'stripe';
import type { PricedCartItem } from '../firebase/orders.server';
import { findOrCreateStripeCustomer, type StripeTaxExemptStatus } from './customer.server';
import { getStripe } from './server';

export interface NetTermsInvoiceResult {
  invoiceId: string;
  hostedInvoiceUrl: string;
  customerId: string;
}

async function findOrCreateCustomer(params: {
  email: string;
  userId: string;
  name?: string;
  taxExempt?: StripeTaxExemptStatus;
}): Promise<Stripe.Customer> {
  return findOrCreateStripeCustomer({
    email: params.email,
    userId: params.userId,
    name: params.name,
    taxExempt: params.taxExempt,
  });
}

export async function createNetTermsInvoice(params: {
  email: string;
  userId: string;
  orderId: string;
  items: PricedCartItem[];
  shipping: number;
  poNumber?: string | null;
  automaticTax?: boolean;
  taxExempt?: StripeTaxExemptStatus;
}): Promise<NetTermsInvoiceResult> {
  const stripe = getStripe();
  const customer = await findOrCreateCustomer({
    email: params.email,
    userId: params.userId,
    name: params.email,
    taxExempt: params.taxExempt,
  });

  for (const item of params.items) {
    await stripe.invoiceItems.create({
      customer: customer.id,
      currency: 'usd',
      amount: Math.round(item.price * item.quantity * 100),
      description: `${item.name} (${item.tag}) ×${item.quantity}`,
      metadata: {
        productId: item.id,
        orderId: params.orderId,
      },
    });
  }

  if (params.shipping > 0) {
    await stripe.invoiceItems.create({
      customer: customer.id,
      currency: 'usd',
      amount: Math.round(params.shipping * 100),
      description: 'Shipping & cold-chain handling',
      metadata: { productId: 'shipping', orderId: params.orderId },
    });
  }

  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: 'send_invoice',
    days_until_due: 30,
    automatic_tax: params.automaticTax ? { enabled: true } : undefined,
    metadata: {
      orderId: params.orderId,
      userId: params.userId,
      poNumber: params.poNumber ?? '',
      paymentMethod: 'net_terms',
    },
  });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  const sent = await stripe.invoices.sendInvoice(finalized.id);

  if (!sent.hosted_invoice_url) {
    throw new Error('Stripe invoice missing hosted URL');
  }

  return {
    invoiceId: sent.id,
    hostedInvoiceUrl: sent.hosted_invoice_url,
    customerId: customer.id,
  };
}

export async function getOrderIdFromInvoice(invoice: Stripe.Invoice): Promise<string | null> {
  return invoice.metadata?.orderId ?? null;
}
