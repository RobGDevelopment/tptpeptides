import 'server-only';

import { getSiteUrl } from '../../site';
import type { IntegrationSecretPayload } from '../types';
import { buildOAuthRedirectUri } from './state.server';
import { persistIntegrationOAuthTokens } from './persist.server';

const AUTHORIZE_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation';
const TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const DEFAULT_SCOPE =
  'locations.readonly contacts.readonly contacts.write opportunities.readonly';

type GoHighLevelOAuthConfig = {
  clientId: string;
  clientSecret: string;
};

type GoHighLevelTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  locationId?: string;
  companyId?: string;
  userType?: string;
};

export type GoHighLevelOAuthStart = {
  authorizeUrl: string;
  redirectUri: string;
};

export type GoHighLevelOAuthCallbackResult = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  locationId: string | null;
  companyId: string | null;
};

function readGoHighLevelOAuthConfig(mode: 'sandbox' | 'live'): GoHighLevelOAuthConfig {
  const clientId =
    (mode === 'sandbox'
      ? process.env.GOHIGHLEVEL_CLIENT_ID_SANDBOX?.trim()
      : undefined) ?? process.env.GOHIGHLEVEL_CLIENT_ID?.trim();
  const clientSecret =
    (mode === 'sandbox'
      ? process.env.GOHIGHLEVEL_CLIENT_SECRET_SANDBOX?.trim()
      : undefined) ?? process.env.GOHIGHLEVEL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      'GoHighLevel OAuth requires GOHIGHLEVEL_CLIENT_ID and GOHIGHLEVEL_CLIENT_SECRET (or sandbox variants).'
    );
  }

  return { clientId, clientSecret };
}

export function buildGoHighLevelAuthorizeUrl(input: {
  state: string;
  mode: 'sandbox' | 'live';
}): GoHighLevelOAuthStart {
  const { clientId } = readGoHighLevelOAuthConfig(input.mode);
  const redirectUri = buildOAuthRedirectUri('gohighlevel', getSiteUrl());

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: process.env.GOHIGHLEVEL_OAUTH_SCOPE?.trim() || DEFAULT_SCOPE,
    state: input.state,
  });

  return {
    authorizeUrl: `${AUTHORIZE_URL}?${params.toString()}`,
    redirectUri,
  };
}

export async function exchangeGoHighLevelAuthorizationCode(input: {
  code: string;
  mode: 'sandbox' | 'live';
}): Promise<GoHighLevelOAuthCallbackResult> {
  const config = readGoHighLevelOAuthConfig(input.mode);
  const redirectUri = buildOAuthRedirectUri('gohighlevel', getSiteUrl());

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: input.code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const payload = (await response.json()) as GoHighLevelTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(`GoHighLevel token exchange failed (${response.status}).`);
  }

  const expiresIn = payload.expires_in ?? 86400;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? '',
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    locationId: payload.locationId?.trim() || null,
    companyId: payload.companyId?.trim() || null,
  };
}

export async function saveGoHighLevelOAuthTokens(input: {
  mode: 'sandbox' | 'live';
  actorAdminUid: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  locationId: string | null;
  companyId: string | null;
}): Promise<void> {
  const config = readGoHighLevelOAuthConfig(input.mode);

  const secrets: IntegrationSecretPayload = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken || undefined,
  };

  await persistIntegrationOAuthTokens({
    slug: 'gohighlevel',
    mode: input.mode,
    actorAdminUid: input.actorAdminUid,
    secrets,
    publicConfig: {
      locationId: input.locationId ?? undefined,
      accountId: input.companyId ?? undefined,
      tokenExpiresAt: input.expiresAt,
    },
  });
}
