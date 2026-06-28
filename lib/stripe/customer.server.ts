import 'server-only';

import type Stripe from 'stripe';
import { getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import { getStripe } from './server';

export type StripeTaxExemptStatus = 'none' | 'exempt';

export async function getTaxExemptStatusForUser(userId: string | null): Promise<StripeTaxExemptStatus> {
  if (!userId || !isAdminSdkConfigured()) return 'none';

  const snap = await getAdminFirestore().collection('users').doc(userId).get();
  return snap.data()?.taxExempt === true ? 'exempt' : 'none';
}

export async function findOrCreateStripeCustomer(params: {
  email: string;
  userId?: string | null;
  name?: string;
  taxExempt?: StripeTaxExemptStatus;
}): Promise<Stripe.Customer> {
  const stripe = getStripe();
  const existing = await stripe.customers.list({ email: params.email, limit: 1 });
  const taxExempt = params.taxExempt ?? 'none';

  if (existing.data[0]) {
    if (existing.data[0].tax_exempt !== taxExempt) {
      return stripe.customers.update(existing.data[0].id, { tax_exempt: taxExempt });
    }
    return existing.data[0];
  }

  return stripe.customers.create({
    email: params.email,
    name: params.name ?? params.email,
    tax_exempt: taxExempt,
    metadata: params.userId ? { userId: params.userId } : undefined,
  });
}
