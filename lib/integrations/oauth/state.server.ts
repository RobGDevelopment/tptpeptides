import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { OAuthIntegrationSlug } from './constants';

export type OAuthStatePayload = {
  state: string;
  slug: OAuthIntegrationSlug;
  mode: 'sandbox' | 'live';
  returnTo: string;
  actorAdminUid: string;
  exp: number;
};

const STATE_TTL_MS = 10 * 60 * 1000;

function readStateSecret(): Buffer {
  const raw =
    process.env.INTEGRATIONS_MASTER_KEY?.trim() ??
    process.env.CRON_SECRET?.trim() ??
    process.env.OAUTH_STATE_SECRET?.trim();

  if (!raw) {
    throw new Error(
      'OAuth state signing requires INTEGRATIONS_MASTER_KEY, CRON_SECRET, or OAUTH_STATE_SECRET.'
    );
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length >= 32) {
    return key.subarray(0, 32);
  }

  return createHmac('sha256', 'medfit-oauth-state').update(raw).digest();
}

function signPayload(encodedPayload: string): string {
  return createHmac('sha256', readStateSecret()).update(encodedPayload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function buildOAuthRedirectUri(slug: OAuthIntegrationSlug, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/api/integrations/${slug}/oauth/callback`;
}

export function createOAuthState(input: {
  slug: OAuthIntegrationSlug;
  mode: 'sandbox' | 'live';
  returnTo: string;
  actorAdminUid: string;
}): { state: string; cookieValue: string } {
  const payload: OAuthStatePayload = {
    state: randomBytes(24).toString('hex'),
    slug: input.slug,
    mode: input.mode,
    returnTo: input.returnTo,
    actorAdminUid: input.actorAdminUid,
    exp: Date.now() + STATE_TTL_MS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(encodedPayload);

  return {
    state: payload.state,
    cookieValue: `${encodedPayload}.${signature}`,
  };
}

export function parseOAuthStateCookie(cookieValue: string | null | undefined): OAuthStatePayload | null {
  if (!cookieValue?.trim()) return null;

  const [encodedPayload, signature] = cookieValue.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  if (!safeEqual(signature, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as OAuthStatePayload;

    if (
      !parsed?.state ||
      !parsed.slug ||
      (parsed.mode !== 'sandbox' && parsed.mode !== 'live') ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }

    if (Date.now() > parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function validateOAuthCallbackState(
  stateFromQuery: string | null,
  cookieValue: string | null | undefined
): OAuthStatePayload | null {
  if (!stateFromQuery?.trim()) return null;

  const payload = parseOAuthStateCookie(cookieValue);
  if (!payload) return null;

  if (!safeEqual(payload.state, stateFromQuery.trim())) {
    return null;
  }

  return payload;
}

export function oauthStateCookieOptions(maxAgeSeconds = 600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
