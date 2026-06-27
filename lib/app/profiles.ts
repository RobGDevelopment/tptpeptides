import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '../brand';

/** Consumer-facing installable web app (storefront + client portal). */
export const CONSUMER_APP = {
  id: 'consumer',
  name: SITE_NAME,
  shortName: 'TPT Peptides',
  description: SITE_DESCRIPTION,
  tagline: SITE_TAGLINE,
  startUrl: '/',
  scope: '/',
  themeColor: '#0a0a0b',
  backgroundColor: '#0a0a0b',
  manifestPath: '/manifest.webmanifest',
} as const;

/** Owner / operator installable web app (back-office). */
export const OWNER_APP = {
  id: 'owner',
  name: 'TPT Peptides Back-Office',
  shortName: 'TPT Back-Office',
  description: 'Lab operations dashboard for catalog, orders, inventory, and CMS.',
  startUrl: '/admin',
  scope: '/admin',
  themeColor: '#0a0a0b',
  backgroundColor: '#0a0a0b',
  manifestPath: '/admin/manifest.webmanifest',
} as const;

export type AppProfile = typeof CONSUMER_APP | typeof OWNER_APP;
