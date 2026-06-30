import 'server-only';

import type { ConnectionTestResult, ResolvedIntegration } from '../types';

export async function testOpenLoopConnection(
  resolved: ResolvedIntegration
): Promise<ConnectionTestResult> {
  const apiKey = resolved.secrets.apiKey?.trim();
  if (!apiKey) {
    return { ok: false, error: 'OpenLoop API key is required.' };
  }

  const baseUrl =
    resolved.publicConfig.baseUrl?.trim().replace(/\/$/, '') ||
    process.env.OPENLOOP_API_BASE?.trim().replace(/\/$/, '');

  if (!baseUrl) {
    if (resolved.mode === 'sandbox') {
      return { ok: true, detail: 'Sandbox credentials saved (no base URL — dry-run ready).' };
    }
    return { ok: false, error: 'OpenLoop base URL is required for live connection tests.' };
  }

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      return { ok: true, detail: `OpenLoop health check succeeded (${response.status}).` };
    }

    if (response.status === 404) {
      return {
        ok: true,
        detail: 'Credentials saved. Health endpoint not found — verify base URL with OpenLoop.',
      };
    }

    return {
      ok: false,
      error: `OpenLoop health check failed (${response.status}).`,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Network error';
    return { ok: false, error: `OpenLoop connection failed: ${message}` };
  }
}
