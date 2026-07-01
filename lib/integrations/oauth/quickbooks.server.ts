import 'server-only';

import { getSiteUrl } from '../../site';
import type { IntegrationSecretPayload } from '../types';
import { buildOAuthRedirectUri } from './state.server';
import { persistIntegrationOAuthTokens } from './persist.server';

const AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const DEFAULT_SCOPE = 'com.intuit.quickbooks.accounting';

type QuickBooksOAuthConfig = {
  clientId: string;
  clientSecret: string;
};

type QuickBooksTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export type QuickBooksOAuthStart = {
  authorizeUrl: string;
  redirectUri: string;
};

export type QuickBooksOAuthCallbackResult = {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

function readQuickBooksOAuthConfig(mode: 'sandbox' | 'live'): QuickBooksOAuthConfig {
  const clientId =
    (mode === 'sandbox'
      ? process.env.QBO_CLIENT_ID_SANDBOX?.trim()
      : undefined) ?? process.env.QBO_CLIENT_ID?.trim();
  const clientSecret =
    (mode === 'sandbox'
      ? process.env.QBO_CLIENT_SECRET_SANDBOX?.trim()
      : undefined) ?? process.env.QBO_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      'QuickBooks OAuth requires QBO_CLIENT_ID and QBO_CLIENT_SECRET (or sandbox variants).'
    );
  }

  return { clientId, clientSecret };
}

export function buildQuickBooksAuthorizeUrl(input: {
  state: string;
  mode: 'sandbox' | 'live';
}): QuickBooksOAuthStart {
  const { clientId } = readQuickBooksOAuthConfig(input.mode);
  const redirectUri = buildOAuthRedirectUri('quickbooks_online', getSiteUrl());

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: process.env.QBO_OAUTH_SCOPE?.trim() || DEFAULT_SCOPE,
    redirect_uri: redirectUri,
    state: input.state,
  });

  return {
    authorizeUrl: `${AUTHORIZE_URL}?${params.toString()}`,
    redirectUri,
  };
}

async function exchangeQuickBooksToken(
  body: URLSearchParams,
  config: QuickBooksOAuthConfig
): Promise<QuickBooksTokenResponse> {
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const payload = (await response.json()) as QuickBooksTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(`QuickBooks token exchange failed (${response.status}).`);
  }

  return payload;
}

export async function exchangeQuickBooksAuthorizationCode(input: {
  code: string;
  mode: 'sandbox' | 'live';
}): Promise<QuickBooksOAuthCallbackResult> {
  const config = readQuickBooksOAuthConfig(input.mode);
  const redirectUri = buildOAuthRedirectUri('quickbooks_online', getSiteUrl());

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: redirectUri,
  });

  const payload = await exchangeQuickBooksToken(body, config);
  const expiresIn = payload.expires_in ?? 3600;

  if (!payload.refresh_token) {
    throw new Error('QuickBooks did not return a refresh token.');
  }

  return {
    realmId: '',
    accessToken: payload.access_token!,
    refreshToken: payload.refresh_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

export async function saveQuickBooksOAuthTokens(input: {
  mode: 'sandbox' | 'live';
  actorAdminUid: string;
  realmId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}): Promise<void> {
  const secrets: IntegrationSecretPayload = {
    clientId: readQuickBooksOAuthConfig(input.mode).clientId,
    clientSecret: readQuickBooksOAuthConfig(input.mode).clientSecret,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  };

  await persistIntegrationOAuthTokens({
    slug: 'quickbooks_online',
    mode: input.mode,
    actorAdminUid: input.actorAdminUid,
    secrets,
    publicConfig: {
      realmId: input.realmId,
      tokenExpiresAt: input.expiresAt,
    },
  });
}

export async function refreshQuickBooksAccessToken(input: {
  mode: 'sandbox' | 'live';
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }> {
  const config = readQuickBooksOAuthConfig(input.mode);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
  });

  const payload = await exchangeQuickBooksToken(body, config);
  const expiresIn = payload.expires_in ?? 3600;

  return {
    accessToken: payload.access_token!,
    refreshToken: payload.refresh_token ?? input.refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}
