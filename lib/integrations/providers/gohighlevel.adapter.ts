import 'server-only';

import type { ConnectionTestResult, ResolvedIntegration } from '../types';

export type GoHighLevelContactPayload = {
  locationId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type GoHighLevelPushResult = {
  ok: boolean;
  contactId?: string;
  error?: string;
};

const GHL_API_BASE =
  process.env.GOHIGHLEVEL_API_BASE?.trim() || 'https://services.leadconnectorhq.com';

function readAccessToken(resolved: ResolvedIntegration): string | null {
  return resolved.secrets.accessToken?.trim() || null;
}

function readLocationId(resolved: ResolvedIntegration): string | null {
  return resolved.publicConfig.locationId?.trim() || null;
}

/**
 * Phase 2 scaffold — upserts a CRM contact in GoHighLevel.
 */
export async function upsertGoHighLevelContact(
  resolved: ResolvedIntegration | null,
  _payload: GoHighLevelContactPayload
): Promise<GoHighLevelPushResult> {
  if (!resolved) {
    return { ok: false, error: 'GoHighLevel is not connected.' };
  }

  const accessToken = readAccessToken(resolved);
  const locationId = readLocationId(resolved);

  if (!accessToken || !locationId) {
    return {
      ok: false,
      error: 'GoHighLevel access token and location ID are required. Connect via OAuth first.',
    };
  }

  return {
    ok: false,
    error: 'GoHighLevel contact sync adapter not yet implemented — OAuth connection ready.',
  };
}

export async function testGoHighLevelConnection(
  resolved: ResolvedIntegration
): Promise<ConnectionTestResult> {
  const accessToken = readAccessToken(resolved);
  const locationId = readLocationId(resolved);

  if (!accessToken || !locationId) {
    return {
      ok: false,
      error: 'GoHighLevel access token and location ID are required. Connect via OAuth first.',
    };
  }

  try {
    const response = await fetch(`${GHL_API_BASE}/locations/${locationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        Version: '2021-07-28',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      return { ok: true, detail: 'GoHighLevel location verified.' };
    }

    if (response.status === 404) {
      return {
        ok: true,
        detail: 'OAuth tokens saved. Location endpoint returned 404 — verify location ID.',
      };
    }

    return {
      ok: false,
      error: `GoHighLevel location check failed (${response.status}).`,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Network error';
    return { ok: false, error: `GoHighLevel connection failed: ${message}` };
  }
}
