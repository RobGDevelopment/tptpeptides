import 'server-only';

import type { BuyLabelInput, ShippingLabelResult, ShippingProvider } from './shippingProvider';

const PROVIDER_ID = 'shipstation' as const;
const DEFAULT_API_BASE = 'https://ssapi.shipstation.com';

export function isShipStationConfigured(): boolean {
  return Boolean(
    process.env.SHIPSTATION_API_KEY?.trim() && process.env.SHIPSTATION_API_SECRET?.trim()
  );
}

function authHeader(): string {
  const key = process.env.SHIPSTATION_API_KEY?.trim();
  const secret = process.env.SHIPSTATION_API_SECRET?.trim();
  if (!key || !secret) {
    throw new Error('SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET are required');
  }
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
}

function apiBase(): string {
  return process.env.SHIPSTATION_API_BASE?.trim() || DEFAULT_API_BASE;
}

async function shipStationPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    throw new Error(`ShipStation request failed (${response.status})`);
  }

  return payload as T;
}

export class ShipStationShippingProvider implements ShippingProvider {
  readonly providerId = PROVIDER_ID;

  async getRate(input: BuyLabelInput): Promise<number | null> {
    if (!isShipStationConfigured()) return null;

    // VERIFY WITH SANDBOX — rates endpoint shape may differ by account type.
    const body = {
      carrierCode: process.env.SHIPSTATION_CARRIER_CODE?.trim() || 'stamps_com',
      serviceCode: process.env.SHIPSTATION_SERVICE_CODE?.trim() || 'usps_priority_mail',
      packageCode: 'package',
      fromPostalCode: process.env.SHIPPING_ORIGIN_ZIP?.trim() || '90210',
      toState: input.toState,
      toPostalCode: input.toPostalCode,
      toCountry: input.toCountry ?? 'US',
      weight: { value: Math.max(8, input.itemCount * 4), units: 'ounces' },
    };

    type RateResponse = { shipmentCost?: number };
    const result = await shipStationPost<RateResponse>('/shipments/getrates', body);
    return typeof result.shipmentCost === 'number' ? result.shipmentCost : null;
  }

  async buyLabel(input: BuyLabelInput): Promise<ShippingLabelResult> {
    const body = {
      carrierCode: process.env.SHIPSTATION_CARRIER_CODE?.trim() || 'stamps_com',
      serviceCode: process.env.SHIPSTATION_SERVICE_CODE?.trim() || 'usps_priority_mail',
      packageCode: 'package',
      confirmation: 'delivery',
      shipDate: new Date().toISOString().slice(0, 10),
      weight: { value: Math.max(8, input.itemCount * 4), units: 'ounces' },
      shipTo: {
        state: input.toState,
        postalCode: input.toPostalCode,
        country: input.toCountry ?? 'US',
      },
      // VERIFY WITH SANDBOX — orderId / advancedOptions wired in Phase 5 auto-label.
    };

    type LabelResponse = {
      trackingNumber?: string;
      carrierCode?: string;
      shipmentCost?: number;
      labelData?: string;
    };

    const result = await shipStationPost<LabelResponse>('/orders/createlabelfororder', body);

    if (!result.trackingNumber) {
      throw new Error('ShipStation did not return a tracking number');
    }

    return {
      trackingNumber: result.trackingNumber,
      carrier: result.carrierCode ?? 'shipstation',
      labelUrl: result.labelData ? `data:application/pdf;base64,${result.labelData}` : null,
      publicTrackerUrl: null,
      rate: result.shipmentCost ?? 0,
    };
  }
}

export function createShipStationShippingProvider(): ShipStationShippingProvider {
  if (!isShipStationConfigured()) {
    throw new Error('ShipStation is not configured');
  }
  return new ShipStationShippingProvider();
}
