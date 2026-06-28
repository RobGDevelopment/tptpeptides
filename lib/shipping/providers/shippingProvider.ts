import type { ShippingAddress } from '../../schemas/user';

export interface ShippingLabelResult {
  trackingNumber: string;
  carrier: string;
  labelUrl: string | null;
  publicTrackerUrl: string | null;
  rate: number;
}

export interface BuyLabelInput {
  toPostalCode: string;
  toState?: string;
  toCountry?: string;
  itemCount: number;
}

export interface ShippingProvider {
  readonly providerId: 'easypost' | 'shipstation';
  getRate(input: BuyLabelInput): Promise<number | null>;
  buyLabel(input: BuyLabelInput): Promise<ShippingLabelResult>;
}
