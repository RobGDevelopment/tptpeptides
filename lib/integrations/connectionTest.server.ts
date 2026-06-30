import 'server-only';

import { getIntegrationDefinition } from './registry';
import { testOpenLoopConnection } from './providers/openloop.adapter';
import type {
  ConnectionTestResult,
  IntegrationDefinition,
  IntegrationSecretPayload,
  IntegrationSlug,
  ResolvedIntegration,
} from './types';

function validateRequiredSecrets(
  definition: IntegrationDefinition,
  mode: ResolvedIntegration['mode'],
  secrets: IntegrationSecretPayload
): ConnectionTestResult | null {
  if (mode === 'disconnected') {
    return { ok: false, error: 'Integration is disconnected.' };
  }

  const required =
    mode === 'sandbox'
      ? (definition.requiredSecrets.sandbox ?? definition.requiredSecrets.live)
      : definition.requiredSecrets.live;

  for (const field of required) {
    const value = secrets[field];
    if (typeof value !== 'string' || !value.trim()) {
      return { ok: false, error: `Missing required credential: ${field}.` };
    }
  }

  return null;
}

async function testResendConnection(resolved: ResolvedIntegration): Promise<ConnectionTestResult> {
  const apiKey = resolved.secrets.apiKey?.trim();
  if (!apiKey) {
    return { ok: false, error: 'Resend API key is required.' };
  }

  try {
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      return { ok: true, detail: 'Resend API key verified.' };
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: 'Resend rejected the API key.' };
    }

    return { ok: true, detail: `Resend responded (${response.status}); key appears valid.` };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Network error';
    return { ok: false, error: `Resend connection failed: ${message}` };
  }
}

async function testGenericConnection(
  definition: IntegrationDefinition,
  resolved: ResolvedIntegration
): Promise<ConnectionTestResult> {
  const validationError = validateRequiredSecrets(definition, resolved.mode, resolved.secrets);
  if (validationError) return validationError;

  const baseUrl = resolved.publicConfig.baseUrl?.trim().replace(/\/$/, '');
  if (!baseUrl) {
    return { ok: true, detail: 'Required credentials present.' };
  }

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (response.ok) {
      return { ok: true, detail: `Health check succeeded (${response.status}).` };
    }

    return {
      ok: true,
      detail: `Credentials saved. Health endpoint returned ${response.status}.`,
    };
  } catch {
    return { ok: true, detail: 'Required credentials present (health endpoint unreachable).' };
  }
}

export async function runIntegrationConnectionTest(
  slug: IntegrationSlug,
  resolved: ResolvedIntegration
): Promise<ConnectionTestResult> {
  const definition = getIntegrationDefinition(slug);

  if (definition.availability === 'coming_soon') {
    return { ok: false, error: `${definition.label} is coming soon (OAuth v1.1).` };
  }

  if (!definition.supportsConnectionTest) {
    return { ok: false, error: 'Connection test is not enabled for this integration.' };
  }

  const validationError = validateRequiredSecrets(definition, resolved.mode, resolved.secrets);
  if (validationError) return validationError;

  switch (slug) {
    case 'openloop':
      return testOpenLoopConnection(resolved);
    case 'resend':
      return testResendConnection(resolved);
    default:
      return testGenericConnection(definition, resolved);
  }
}
