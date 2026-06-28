import 'server-only';

import type { ModuleFlags } from '../schemas/modules';
import { estimateShipping } from './estimate';
import { isModuleEnabled } from '../modules/flags';
import { getEasyPostShippingRate, isEasyPostConfigured } from './easypost.server';

export interface ShippingDestination {
  postalCode?: string | null;
  state?: string | null;
  country?: string | null;
}

export async function resolveShippingCost(params: {
  flags: ModuleFlags;
  itemCount: number;
  destination?: ShippingDestination;
}): Promise<number> {
  const flatRate = estimateShipping(params.itemCount);

  if (!isModuleEnabled(params.flags, 'isRealShippingEnabled') || !isEasyPostConfigured()) {
    return flatRate;
  }

  const postalCode = params.destination?.postalCode?.trim();
  if (!postalCode) {
    return flatRate;
  }

  try {
    const rate = await getEasyPostShippingRate({
      toPostalCode: postalCode,
      toState: params.destination?.state ?? undefined,
      toCountry: params.destination?.country ?? 'US',
      itemCount: params.itemCount,
    });
    return rate ?? flatRate;
  } catch (error) {
    console.warn('[shipping] EasyPost rate lookup failed — using flat estimate', error);
    return flatRate;
  }
}
