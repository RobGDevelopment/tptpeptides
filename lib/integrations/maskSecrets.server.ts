import 'server-only';

import type { IntegrationSecretPayload } from './types';

const SECRET_FIELD_KEYS = [
  'apiKey',
  'apiSecret',
  'clientId',
  'clientSecret',
  'accessToken',
  'refreshToken',
  'webhookSigningSecret',
  'webhookSecret',
  'privateKey',
  'webhookUrl',
] as const satisfies readonly (keyof IntegrationSecretPayload)[];

export function maskSecretValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 4) return '••••';
  return `••••${trimmed.slice(-4)}`;
}

export function maskSecretPayload(
  payload: IntegrationSecretPayload | null | undefined
): Partial<Record<keyof IntegrationSecretPayload, string>> {
  if (!payload) return {};

  const masked: Partial<Record<keyof IntegrationSecretPayload, string>> = {};
  for (const key of SECRET_FIELD_KEYS) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      masked[key] = maskSecretValue(value);
    }
  }
  return masked;
}
