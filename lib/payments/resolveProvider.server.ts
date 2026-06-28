import 'server-only';

import { getTenantConfig } from '../firebase/tenant.server';
import { DEFAULT_TENANT_ID } from '../tenant/constants';
import type { TenantConfig } from '../schemas/tenant';
import { PaymentConfigurationError } from './errors';
import type { PaymentProvider } from './providers/paymentProvider';
import {
  createAuthorizeNetProvider,
  createNmiProvider,
  createPayRamProvider,
  createSeamlessChexProvider,
  createStripeLegacyProvider,
  isAuthorizeNetConfigured,
  isNmiConfigured,
  isPayRamConfigured,
  isSeamlessChexConfigured,
} from './providers';
import { isStripeConfigured } from '../stripe/server';
import type { PaymentProviderId, PaymentRail } from './types';

export function resolvePaymentRail(config: TenantConfig): PaymentRail {
  if (config.payment?.rail) return config.payment.rail;
  return config.lane === 'b2c' ? 'b2c_ach' : 'b2b_card';
}

/** Chooses provider id from tenant_config — does not call checkout routes. */
export function resolvePaymentProviderId(config: TenantConfig): PaymentProviderId {
  if (config.payment?.primaryProvider) {
    return config.payment.primaryProvider;
  }

  if (config.lane === 'b2c') {
    return 'seamlesschex';
  }

  if (config.payment?.useStripeUntilCutover !== false) {
    return 'stripe';
  }

  return isAuthorizeNetConfigured() ? 'authorizenet' : 'nmi';
}

export async function resolvePaymentProviderIdForTenant(
  tenantId: string = DEFAULT_TENANT_ID
): Promise<PaymentProviderId> {
  const config = await getTenantConfig(tenantId);
  return resolvePaymentProviderId(config);
}

export function createPaymentProvider(providerId: PaymentProviderId): PaymentProvider {
  switch (providerId) {
    case 'stripe':
      return createStripeLegacyProvider();
    case 'authorizenet':
      return createAuthorizeNetProvider();
    case 'nmi':
      return createNmiProvider();
    case 'seamlesschex':
      return createSeamlessChexProvider();
    case 'payram':
      return createPayRamProvider();
    default: {
      const exhaustive: never = providerId;
      throw new PaymentConfigurationError(String(exhaustive), 'Unknown payment provider.');
    }
  }
}

export function isPaymentProviderConfigured(providerId: PaymentProviderId): boolean {
  switch (providerId) {
    case 'stripe':
      return isStripeConfigured();
    case 'authorizenet':
      return isAuthorizeNetConfigured();
    case 'nmi':
      return isNmiConfigured();
    case 'seamlesschex':
      return isSeamlessChexConfigured();
    case 'payram':
      return isPayRamConfigured();
    default:
      return false;
  }
}

/** Loads tenant config and returns a configured adapter instance. */
export async function resolvePaymentProviderForTenant(
  tenantId: string = DEFAULT_TENANT_ID
): Promise<PaymentProvider> {
  const providerId = await resolvePaymentProviderIdForTenant(tenantId);
  if (!isPaymentProviderConfigured(providerId)) {
    throw new PaymentConfigurationError(
      providerId,
      `Payment provider "${providerId}" is not configured for tenant "${tenantId}".`
    );
  }
  return createPaymentProvider(providerId);
}
