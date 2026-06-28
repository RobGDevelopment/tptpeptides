import 'server-only';

import { getOperationsSettings } from '../firebase/operations.server';
import { createEasyPostShippingProvider, isEasyPostShippingConfigured } from './providers/easypostProvider.server';
import {
  createShipStationShippingProvider,
  isShipStationConfigured,
} from './providers/shipstation.server';
import type { ShippingProvider } from './providers/shippingProvider';

export async function resolveShippingProvider(): Promise<ShippingProvider> {
  const settings = await getOperationsSettings();

  if (settings.shippingProvider === 'shipstation' && isShipStationConfigured()) {
    return createShipStationShippingProvider();
  }

  if (!isEasyPostShippingConfigured()) {
    throw new Error('No shipping provider is configured');
  }

  return createEasyPostShippingProvider();
}

export function isShippingProviderConfigured(provider: 'easypost' | 'shipstation'): boolean {
  return provider === 'shipstation' ? isShipStationConfigured() : isEasyPostShippingConfigured();
}
