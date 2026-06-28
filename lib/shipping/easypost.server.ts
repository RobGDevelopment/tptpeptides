import 'server-only';

const EASYPOST_API = 'https://api.easypost.com/v2';

function authHeader(): string {
  const apiKey = process.env.EASYPOST_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('EASYPOST_API_KEY is not configured');
  }
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

export function isEasyPostConfigured(): boolean {
  return Boolean(process.env.EASYPOST_API_KEY?.trim());
}

function originAddress() {
  return {
    zip: process.env.SHIPPING_ORIGIN_ZIP?.trim() || '90210',
    state: process.env.SHIPPING_ORIGIN_STATE?.trim() || 'CA',
    country: 'US',
  };
}

function parcelForItems(itemCount: number) {
  const weightOz = Math.max(8, itemCount * 4);
  return { weight: weightOz };
}

interface EasyPostAddress {
  zip: string;
  state?: string;
  country: string;
}

interface EasyPostRate {
  id: string;
  rate: string;
  carrier: string;
  service: string;
}

interface EasyPostShipmentResponse {
  id: string;
  rates?: EasyPostRate[];
  tracker?: { public_url?: string };
  tracking_code?: string;
  postage_label?: { label_url?: string };
  selected_rate?: EasyPostRate;
}

async function createShipment(params: {
  to: EasyPostAddress;
  itemCount: number;
}): Promise<EasyPostShipmentResponse> {
  const response = await fetch(`${EASYPOST_API}/shipments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shipment: {
        to_address: {
          zip: params.to.zip,
          state: params.to.state,
          country: params.to.country,
        },
        from_address: originAddress(),
        parcel: parcelForItems(params.itemCount),
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`EasyPost shipment failed (${response.status}): ${body}`);
  }

  return (await response.json()) as EasyPostShipmentResponse;
}

export async function getEasyPostShippingRate(params: {
  toPostalCode: string;
  toState?: string;
  toCountry?: string;
  itemCount: number;
}): Promise<number | null> {
  const shipment = await createShipment({
    to: {
      zip: params.toPostalCode,
      state: params.toState,
      country: params.toCountry ?? 'US',
    },
    itemCount: params.itemCount,
  });

  const rates = shipment.rates ?? [];
  if (rates.length === 0) return null;

  const cheapest = rates.reduce((best, rate) =>
    Number(rate.rate) < Number(best.rate) ? rate : best
  );

  return Math.round(Number(cheapest.rate) * 100) / 100;
}

export async function buyEasyPostLabel(params: {
  toPostalCode: string;
  toState?: string;
  toCountry?: string;
  itemCount: number;
}): Promise<{
  trackingNumber: string;
  carrier: string;
  labelUrl: string | null;
  publicTrackerUrl: string | null;
  rate: number;
}> {
  const shipment = await createShipment({
    to: {
      zip: params.toPostalCode,
      state: params.toState,
      country: params.toCountry ?? 'US',
    },
    itemCount: params.itemCount,
  });

  const rates = shipment.rates ?? [];
  if (rates.length === 0) {
    throw new Error('No carrier rates returned from EasyPost');
  }

  const selected = rates.reduce((best, rate) =>
    Number(rate.rate) < Number(best.rate) ? rate : best
  );

  const buyResponse = await fetch(`${EASYPOST_API}/shipments/${shipment.id}/buy`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rate: { id: selected.id } }),
  });

  if (!buyResponse.ok) {
    const body = await buyResponse.text();
    throw new Error(`EasyPost label purchase failed (${buyResponse.status}): ${body}`);
  }

  const purchased = (await buyResponse.json()) as EasyPostShipmentResponse;
  const trackingNumber = purchased.tracking_code ?? '';
  const carrier = purchased.selected_rate?.carrier ?? selected.carrier;

  return {
    trackingNumber,
    carrier,
    labelUrl: purchased.postage_label?.label_url ?? null,
    publicTrackerUrl: purchased.tracker?.public_url ?? null,
    rate: Number(purchased.selected_rate?.rate ?? selected.rate),
  };
}
