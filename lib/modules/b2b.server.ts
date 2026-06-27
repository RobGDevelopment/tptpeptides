import 'server-only';

import type { ModuleFlagKey, ModuleFlags } from '../schemas/modules';
import { isModuleEnabled } from './flags';
import { ModuleDisabledError, requireModule } from './requireModule.server';

export { ModuleDisabledError };

/** Sub-flags that require the B2B procurement master switch. */
export const B2B_PROCUREMENT_FLAGS = [
  'isInstitutionVerificationEnabled',
  'isTieredPricingEnabled',
  'isQuoteWorkflowEnabled',
  'isNetTermsEnabled',
] as const satisfies readonly ModuleFlagKey[];

export type B2BProcurementFlag = (typeof B2B_PROCUREMENT_FLAGS)[number];

export function isB2BProcurementFlag(key: ModuleFlagKey): key is B2BProcurementFlag {
  return (B2B_PROCUREMENT_FLAGS as readonly ModuleFlagKey[]).includes(key);
}

/** True when the master B2B switch and the sub-flag are both enabled. */
export function isB2BFeatureEnabled(flags: ModuleFlags, key: B2BProcurementFlag): boolean {
  return isModuleEnabled(flags, 'isB2BProcurementEnabled') && isModuleEnabled(flags, key);
}

/** API guard — requires B2B master + optional sub-flag. */
export function requireB2BProcurement(flags: ModuleFlags, key?: B2BProcurementFlag): void {
  if (!isModuleEnabled(flags, 'isB2BProcurementEnabled')) {
    throw new ModuleDisabledError('isB2BProcurementEnabled');
  }
  if (key) {
    requireModule(flags, key);
  }
}
