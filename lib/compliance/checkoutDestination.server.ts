import 'server-only';

import { assertShippingAllowed, GeoBlockedError } from './geoBlock';
import { getComplianceSettings } from '../firebase/compliance.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import type { ModuleFlags } from '../schemas/modules';
import { isModuleEnabled } from '../modules/flags';

export { GeoBlockedError };

export interface CheckoutDestinationInput {
  userId?: string | null;
  shippingState?: string;
  shippingPostalCode?: string;
}

export async function resolveCheckoutDestination(
  input: CheckoutDestinationInput
): Promise<{ state: string | null; postalCode: string | null }> {
  let state = input.shippingState?.trim() || null;
  let postalCode = input.shippingPostalCode?.trim() || null;

  if (input.userId && isAdminSdkConfigured()) {
    const db = getAdminFirestore();
    const userSnap = await db.collection('users').doc(input.userId).get();
    const address = userSnap.data()?.shippingAddress as
      | { state?: string; postalCode?: string }
      | undefined;

    if (!state && address?.state) state = address.state;
    if (!postalCode && address?.postalCode) postalCode = address.postalCode;
  }

  return { state, postalCode };
}

export async function enforceGeoCompliance(
  flags: ModuleFlags,
  destination: { state: string | null }
): Promise<void> {
  if (!isModuleEnabled(flags, 'isComplianceGeoBlockEnabled')) {
    return;
  }

  const settings = await getComplianceSettings();
  assertShippingAllowed(destination.state, settings.restrictedStates);
}
