import type { UserRole } from '../schemas/user';



/** Super Admin only — module toggles, audit logs, rollout guide. */

export const SUPER_ADMIN_PREFIXES = ['/admin/modules', '/admin/audit', '/admin/rollout', '/admin/satellites'] as const;



/** Operations — fulfillment, catalog, inventory, storefront CMS. */

export const OPS_ALLOWED_PREFIXES = [

  '/admin',

  '/admin/orders',

  '/admin/products',

  '/admin/inventory',

  '/admin/storefront',

  '/admin/system-map',

  '/admin/growth',
  '/admin/exceptions',
  '/admin/satellites',
  '/admin/ledger',
] as const;



/** Finance — order exports, margin reporting. */

export const FINANCE_ALLOWED_PREFIXES = [

  '/admin',

  '/admin/orders',

  '/admin/sales',
  '/admin/proforma',
  '/admin/ledger',
] as const;



/** Support — customer accounts and KYB queue. */

export const SUPPORT_ALLOWED_PREFIXES = [

  '/admin',

  '/admin/orders',

  '/admin/users',

  '/admin/verifications',

] as const;



function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {

  return prefixes.some(

    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)

  );

}



function isSuperAdminRoute(pathname: string): boolean {

  return SUPER_ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

}



export function isRouteAllowedForRole(pathname: string, role: UserRole, rbacEnabled: boolean): boolean {

  if (!rbacEnabled || role === 'admin') {

    return true;

  }



  if (isSuperAdminRoute(pathname)) {

    return false;

  }



  /** Sales receives full commercial access except Super Admin enclaves (legacy partner parity). */

  if (role === 'sales') {

    return true;

  }



  if (role === 'ops') {

    return matchesPrefix(pathname, OPS_ALLOWED_PREFIXES);

  }



  if (role === 'finance') {

    return matchesPrefix(pathname, FINANCE_ALLOWED_PREFIXES);

  }



  if (role === 'support') {

    return matchesPrefix(pathname, SUPPORT_ALLOWED_PREFIXES);

  }



  return false;

}



export function adminRouteForbiddenMessage(role: UserRole): string {

  switch (role) {

    case 'ops':

      return 'This area requires Operations, Sales, or Super Admin access.';

    case 'finance':

      return 'This area requires Finance, Sales, or Super Admin access.';

    case 'support':

      return 'This area requires Support, Sales, or Super Admin access.';

    case 'sales':

      return 'This area requires Super Admin access.';

    default:

      return 'This area requires Super Admin access.';

  }

}



export function canExportFinancials(role: UserRole): boolean {

  return role === 'admin' || role === 'finance';

}



export { hasAdminPortalRole, ADMIN_PORTAL_ROLES } from '../schemas/user';


