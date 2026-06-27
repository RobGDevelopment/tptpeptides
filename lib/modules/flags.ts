import type { ModuleFlagKey, ModuleFlags } from '../schemas/modules';

export function isModuleEnabled(flags: ModuleFlags, key: ModuleFlagKey): boolean {
  return flags[key] === true;
}

export function pickModuleFlags(flags: ModuleFlags, keys: ModuleFlagKey[]): boolean {
  return keys.every((key) => isModuleEnabled(flags, key));
}
