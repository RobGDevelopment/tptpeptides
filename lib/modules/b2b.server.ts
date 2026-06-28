import 'server-only';

import type { ModuleFlags } from '../schemas/modules';
import { B2B_PROCUREMENT_FLAGS, isB2BFeatureEnabled, isB2BProcurementFlag } from './b2b';
import type { B2BProcurementFlag } from './b2b';
import { isModuleEnabled } from './flags';
import { ModuleDisabledError, requireModule } from './requireModule.server';

export { B2B_PROCUREMENT_FLAGS, isB2BFeatureEnabled, isB2BProcurementFlag };
export type { B2BProcurementFlag };
export { ModuleDisabledError };

/** API guard — requires B2B master + optional sub-flag. */
export function requireB2BProcurement(flags: ModuleFlags, key?: B2BProcurementFlag): void {
  if (!isModuleEnabled(flags, 'isB2BProcurementEnabled')) {
    throw new ModuleDisabledError('isB2BProcurementEnabled');
  }
  if (key) {
    requireModule(flags, key);
  }
}
