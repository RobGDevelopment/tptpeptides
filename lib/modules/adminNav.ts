import type { ModuleFlags } from '../schemas/modules';

import { showQuotesNav, showSalesNav, showGrowthNav, showUsersNav, showVerificationsNav } from './adminModuleLinks';



export interface AdminNavItem {

  href: string;

  label: string;

  exact?: boolean;

  /** Premium executive link — gold glass treatment in sidebar */

  premium?: boolean;

}



export interface AdminNavSection {

  title?: string;

  items: AdminNavItem[];

}



const CORE_NAV: AdminNavItem[] = [

  { href: '/admin', label: 'Dashboard', exact: true },

  { href: '/admin/products', label: 'Products' },

  { href: '/admin/storefront', label: 'Storefront' },

  { href: '/admin/orders', label: 'Orders' },

  { href: '/admin/inventory', label: 'Inventory' },

];



const FLEET_NAV: AdminNavItem[] = [

  { href: '/admin/satellites', label: 'Satellites' },

  { href: '/admin/exceptions', label: 'Exceptions' },

  { href: '/admin/ledger', label: 'Ledger' },

];



const MODULE_NAV: {

  item: AdminNavItem;

  visible: (flags: ModuleFlags) => boolean;

}[] = [

  {

    item: { href: '/admin/verifications', label: 'Verifications' },

    visible: showVerificationsNav,

  },

  {

    item: { href: '/admin/quotes', label: 'Quotes' },

    visible: showQuotesNav,

  },

  {

    item: { href: '/admin/sales', label: 'Sales' },

    visible: showSalesNav,

  },

  {

    item: { href: '/admin/growth', label: 'Growth' },

    visible: showGrowthNav,

  },

  {

    item: { href: '/admin/users', label: 'Users' },

    visible: showUsersNav,

  },

];



const UTILITY_NAV: AdminNavItem[] = [

  { href: '/admin/manual', label: 'Operating System', premium: true },

  { href: '/admin/proforma', label: 'Proforma' },

  { href: '/admin/rollout', label: 'Rollout Guide' },

  { href: '/admin/modules', label: 'Modules' },

  { href: '/admin/system-map', label: 'Master Map' },

  { href: '/admin/audit', label: 'Audit Logs' },

];



export function buildAdminNavItems(flags: ModuleFlags): AdminNavItem[] {

  return buildAdminNavSections(flags).flatMap((section) => section.items);

}



export function buildAdminNavSections(flags: ModuleFlags): AdminNavSection[] {

  const moduleItems = MODULE_NAV.filter(({ visible }) => visible(flags)).map(({ item }) => item);



  const sections: AdminNavSection[] = [{ items: CORE_NAV }];



  if (moduleItems.length > 0) {

    sections.push({ title: 'Commercial', items: moduleItems });

  }



  sections.push({ title: 'Fleet OS', items: FLEET_NAV });

  sections.push({ title: 'System', items: UTILITY_NAV });



  return sections;

}



export { FLEET_NAV };


