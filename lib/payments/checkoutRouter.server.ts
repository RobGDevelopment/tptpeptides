import 'server-only';

import { getTenantConfig } from '../firebase/tenant.server';
import { isModuleEnabled } from '../modules/flags';
import type { ModuleFlags } from '../schemas/modules';
import type { TenantConfig } from '../schemas/tenant';
import {
  isPaymentProviderConfigured,
  resolvePaymentProviderId,
} from './resolveProvider.server';
import type { PaymentProviderId } from './types';

export type CheckoutPaymentMode = 'stripe_checkout' | 'direct_provider';

export interface CheckoutPaymentPlan {
  mode: CheckoutPaymentMode;
  providerId: PaymentProviderId;
  tenantId: string;
  useStripeUntilCutover: boolean;
}

/** Resolves effective checkout rail — Stripe remains default when cutover flag is true. */
export function resolveCheckoutPaymentPlan(
  config: TenantConfig,
  flags: ModuleFlags
): CheckoutPaymentPlan {
  const providerId = resolvePaymentProviderId(config);
  const useStripeUntilCutover = config.payment?.useStripeUntilCutover !== false;
  const alternateEnabled = isModuleEnabled(flags, 'isAlternatePaymentRailsEnabled');

  const forceStripe =
    !alternateEnabled ||
    useStripeUntilCutover ||
    providerId === 'stripe' ||
    !isPaymentProviderConfigured(providerId);

  return {
    mode: forceStripe ? 'stripe_checkout' : 'direct_provider',
    providerId: forceStripe ? 'stripe' : providerId,
    tenantId: config.slug,
    useStripeUntilCutover,
  };
}

export async function resolveCheckoutPaymentPlanForTenant(
  tenantId: string,
  flags: ModuleFlags
): Promise<CheckoutPaymentPlan> {
  const config = await getTenantConfig(tenantId);
  return resolveCheckoutPaymentPlan(config, flags);
}
