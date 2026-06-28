import 'server-only';

import {
  getAccountingSettings,
  saveAccountingSettings,
} from '../firebase/accountingSettings.server';

const TOKEN_ENDPOINT = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface QboTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

function envCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.QBO_CLIENT_ID?.trim();
  const clientSecret = process.env.QBO_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function isTokenValid(expiresAtIso: string | undefined): boolean {
  if (!expiresAtIso) return false;
  const expiresAt = new Date(expiresAtIso).getTime();
  return expiresAt - Date.now() > EXPIRY_BUFFER_MS;
}

async function refreshQboTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}> {
  const credentials = envCredentials();
  if (!credentials) {
    throw new Error('QBO_CLIENT_ID and QBO_CLIENT_SECRET are required for token refresh');
  }

  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const payload = (await response.json()) as QboTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(`QuickBooks token refresh failed (${response.status})`);
  }

  const expiresIn = payload.expires_in ?? 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? refreshToken,
    expiresAt,
  };
}

/** Returns a valid QBO access token — refreshes and persists to Firestore when needed. */
export async function getValidQboAccessToken(): Promise<string | null> {
  const settings = await getAccountingSettings();
  const envAccess = process.env.QBO_ACCESS_TOKEN?.trim();
  const envRefresh = process.env.QBO_REFRESH_TOKEN?.trim();

  const cachedAccess = settings?.qboAccessToken?.trim() || envAccess;
  if (cachedAccess && isTokenValid(settings?.qboTokenExpiresAt)) {
    return cachedAccess;
  }

  const refreshToken = settings?.qboRefreshToken?.trim() || envRefresh;
  if (!refreshToken) {
    return envAccess ?? null;
  }

  if (!envCredentials()) {
    return envAccess ?? null;
  }

  const refreshed = await refreshQboTokens(refreshToken);

  await saveAccountingSettings({
    qboAccessToken: refreshed.accessToken,
    qboRefreshToken: refreshed.refreshToken,
    qboRealmId: settings?.qboRealmId ?? process.env.QBO_REALM_ID?.trim(),
    qboTokenExpiresAt: refreshed.expiresAt,
  });

  return refreshed.accessToken;
}

export function isQuickBooksOAuthConfigured(): boolean {
  const realmId = process.env.QBO_REALM_ID?.trim();
  const refreshToken = process.env.QBO_REFRESH_TOKEN?.trim();
  const accessToken = process.env.QBO_ACCESS_TOKEN?.trim();
  const hasOAuthClient = Boolean(envCredentials());
  return Boolean(realmId && (refreshToken || accessToken) && (hasOAuthClient || accessToken));
}
