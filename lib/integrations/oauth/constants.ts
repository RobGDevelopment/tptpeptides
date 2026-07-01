import type { IntegrationSlug } from '../types';

export const OAUTH_INTEGRATION_SLUGS = ['quickbooks_online', 'gohighlevel'] as const;

export type OAuthIntegrationSlug = (typeof OAUTH_INTEGRATION_SLUGS)[number];

export function isOAuthIntegrationSlug(slug: string): slug is OAuthIntegrationSlug {
  return (OAUTH_INTEGRATION_SLUGS as readonly string[]).includes(slug);
}

export function assertOAuthIntegrationSlug(slug: string): OAuthIntegrationSlug {
  if (!isOAuthIntegrationSlug(slug)) {
    throw new Error(`OAuth is not supported for integration "${slug}".`);
  }
  return slug;
}

export function oauthIntegrationSlugToIntegrationSlug(slug: OAuthIntegrationSlug): IntegrationSlug {
  return slug;
}

export function buildOAuthStartPath(
  slug: OAuthIntegrationSlug,
  mode: 'sandbox' | 'live' = 'live',
  returnTo = '/admin/settings/integrations'
): string {
  const params = new URLSearchParams({ mode, returnTo });
  return `/api/integrations/${slug}/oauth/start?${params.toString()}`;
}
