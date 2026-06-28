import { DEFAULT_TENANT_ID } from './constants';

/** Server-side visibility gate — never trust client filtering. */
export function isProductVisibleToTenant(
  tenantVisibility: string[] | undefined | null,
  tenantId: string
): boolean {
  if (!tenantVisibility || tenantVisibility.length === 0) {
    return tenantId === DEFAULT_TENANT_ID;
  }
  return tenantVisibility.includes(tenantId);
}
