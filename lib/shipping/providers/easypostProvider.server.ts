import 'server-only';

import {
  buyEasyPostLabel,
  getEasyPostShippingRate,
  isEasyPostConfigured,
} from '../easypost.server';
import type { BuyLabelInput, ShippingProvider } from './shippingProvider';

export class EasyPostShippingProvider implements ShippingProvider {
  readonly providerId = 'easypost' as const;

  async getRate(input: BuyLabelInput): Promise<number | null> {
    return getEasyPostShippingRate({
      toPostalCode: input.toPostalCode,
      toState: input.toState,
      toCountry: input.toCountry,
      itemCount: input.itemCount,
    });
  }

  async buyLabel(input: BuyLabelInput) {
    return buyEasyPostLabel({
      toPostalCode: input.toPostalCode,
      toState: input.toState,
      toCountry: input.toCountry,
      itemCount: input.itemCount,
    });
  }
}

export function isEasyPostShippingConfigured(): boolean {
  return isEasyPostConfigured();
}

export function createEasyPostShippingProvider(): EasyPostShippingProvider {
  return new EasyPostShippingProvider();
}
