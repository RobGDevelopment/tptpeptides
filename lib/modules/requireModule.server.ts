import 'server-only';

import type { ModuleFlagKey, ModuleFlags } from '../schemas/modules';
import { isModuleEnabled } from './flags';

export class ModuleDisabledError extends Error {
  readonly statusCode = 404;
  readonly moduleKey: ModuleFlagKey;

  constructor(moduleKey: ModuleFlagKey) {
    super(`Module "${moduleKey}" is not enabled`);
    this.name = 'ModuleDisabledError';
    this.moduleKey = moduleKey;
  }
}

/** Throws when the requested module flag is off — use in API routes. */
export function requireModule(flags: ModuleFlags, key: ModuleFlagKey): void {
  if (!isModuleEnabled(flags, key)) {
    throw new ModuleDisabledError(key);
  }
}
