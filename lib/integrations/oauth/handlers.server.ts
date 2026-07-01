import 'server-only';

import type { OAuthIntegrationSlug } from './constants';
import {
  buildGoHighLevelAuthorizeUrl,
  exchangeGoHighLevelAuthorizationCode,
  saveGoHighLevelOAuthTokens,
} from './gohighlevel.server';
import {
  buildQuickBooksAuthorizeUrl,
  exchangeQuickBooksAuthorizationCode,
  saveQuickBooksOAuthTokens,
} from './quickbooks.server';

export function buildIntegrationAuthorizeUrl(input: {
  slug: OAuthIntegrationSlug;
  state: string;
  mode: 'sandbox' | 'live';
}): string {
  switch (input.slug) {
    case 'quickbooks_online':
      return buildQuickBooksAuthorizeUrl({ state: input.state, mode: input.mode }).authorizeUrl;
    case 'gohighlevel':
      return buildGoHighLevelAuthorizeUrl({ state: input.state, mode: input.mode }).authorizeUrl;
    default: {
      const exhaustive: never = input.slug;
      throw new Error(`Unsupported OAuth integration: ${exhaustive}`);
    }
  }
}

export async function completeIntegrationOAuthCallback(input: {
  slug: OAuthIntegrationSlug;
  mode: 'sandbox' | 'live';
  actorAdminUid: string;
  code: string;
  realmId?: string | null;
}): Promise<void> {
  switch (input.slug) {
    case 'quickbooks_online': {
      const tokens = await exchangeQuickBooksAuthorizationCode({
        code: input.code,
        mode: input.mode,
      });
      const realmId = input.realmId?.trim();
      if (!realmId) {
        throw new Error('QuickBooks callback missing realmId.');
      }
      await saveQuickBooksOAuthTokens({
        mode: input.mode,
        actorAdminUid: input.actorAdminUid,
        realmId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      });
      return;
    }
    case 'gohighlevel': {
      const tokens = await exchangeGoHighLevelAuthorizationCode({
        code: input.code,
        mode: input.mode,
      });
      await saveGoHighLevelOAuthTokens({
        mode: input.mode,
        actorAdminUid: input.actorAdminUid,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        locationId: tokens.locationId,
        companyId: tokens.companyId,
      });
      return;
    }
    default: {
      const exhaustive: never = input.slug;
      throw new Error(`Unsupported OAuth integration: ${exhaustive}`);
    }
  }
}
