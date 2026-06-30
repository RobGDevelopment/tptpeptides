import 'server-only';

import {
  dbBytesToEncryptedBlob,
  decryptSecrets,
} from './crypto.server';
import {
  IntegrationNotConfiguredError,
  IntegrationValidationError,
  UnknownIntegrationError,
} from './errors';
import { getIntegrationDefinition } from './registry';
import { createAdminClient } from '../supabase/admin';
import type {
  IntegrationMode,
  IntegrationPublicConfig,
  IntegrationSecretPayload,
  IntegrationSlug,
  ResolvedIntegration,
} from './types';

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  value: ResolvedIntegration;
};

const resolvedIntegrationCache = new Map<string, CacheEntry>();

export type ResolveIntegrationOptions = {
  /** Override DB mode (sandbox/live only). */
  mode?: Exclude<IntegrationMode, 'disconnected'>;
  /** When true, OpenLoop falls back to OPENLOOP_* env vars if DB secrets are absent. */
  fallbackEnv?: boolean;
};

type PlatformIntegrationRow = {
  id: string;
  slug: string;
  category: string;
  mode: IntegrationMode;
  is_enabled: boolean;
  public_config: IntegrationPublicConfig | null;
  secrets_ciphertext_sandbox: Buffer | Uint8Array | string | null;
  secrets_ciphertext_live: Buffer | Uint8Array | string | null;
  encryption_key_version: number;
  last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | null;
  last_test_error: string | null;
  updated_at: string;
};

function cacheKey(slug: IntegrationSlug, mode: IntegrationMode): string {
  return `${slug}:${mode}`;
}

export function invalidateIntegrationCache(slug?: IntegrationSlug): void {
  if (!slug) {
    resolvedIntegrationCache.clear();
    return;
  }

  for (const key of resolvedIntegrationCache.keys()) {
    if (key.startsWith(`${slug}:`)) {
      resolvedIntegrationCache.delete(key);
    }
  }
}

function readCached(slug: IntegrationSlug, mode: IntegrationMode): ResolvedIntegration | null {
  const key = cacheKey(slug, mode);
  const entry = resolvedIntegrationCache.get(key);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    resolvedIntegrationCache.delete(key);
    return null;
  }

  return entry.value;
}

function writeCache(slug: IntegrationSlug, mode: IntegrationMode, value: ResolvedIntegration): void {
  resolvedIntegrationCache.set(cacheKey(slug, mode), {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
}

function resolveOpenLoopEnvFallback(
  mode: Exclude<IntegrationMode, 'disconnected'>
): IntegrationSecretPayload | null {
  const apiKey = process.env.OPENLOOP_API_KEY?.trim();
  if (!apiKey) return null;

  if (mode === 'sandbox' && process.env.OPENLOOP_DISPATCH_DRY_RUN?.trim().toLowerCase() !== 'true') {
    return null;
  }

  return { apiKey };
}

function resolveOpenLoopPublicConfigFromEnv(): IntegrationPublicConfig {
  const baseUrl = process.env.OPENLOOP_API_BASE?.trim();
  return baseUrl ? { baseUrl } : {};
}

function decryptModeSecrets(
  row: PlatformIntegrationRow,
  mode: Exclude<IntegrationMode, 'disconnected'>
): IntegrationSecretPayload {
  const ciphertext =
    mode === 'sandbox' ? row.secrets_ciphertext_sandbox : row.secrets_ciphertext_live;

  if (!ciphertext) {
    return {};
  }

  const blob = dbBytesToEncryptedBlob(ciphertext, row.encryption_key_version);
  if (!blob) return {};

  return decryptSecrets(blob, row.encryption_key_version);
}

export async function getIntegrationRow(slug: IntegrationSlug): Promise<PlatformIntegrationRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('platform_integrations')
    .select(
      'id, slug, category, mode, is_enabled, public_config, secrets_ciphertext_sandbox, secrets_ciphertext_live, encryption_key_version, last_tested_at, last_test_status, last_test_error, updated_at'
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PlatformIntegrationRow | null) ?? null;
}

export async function listIntegrationRows(): Promise<PlatformIntegrationRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('platform_integrations')
    .select(
      'id, slug, category, mode, is_enabled, public_config, secrets_ciphertext_sandbox, secrets_ciphertext_live, encryption_key_version, last_tested_at, last_test_status, last_test_error, updated_at'
    )
    .order('category', { ascending: true })
    .order('slug', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PlatformIntegrationRow[];
}

export async function resolveIntegration(
  slug: string,
  options: ResolveIntegrationOptions = {}
): Promise<ResolvedIntegration> {
  const definition = getIntegrationDefinition(slug);
  const integrationSlug = definition.slug;

  const row = await getIntegrationRow(integrationSlug);
  if (!row) {
    throw new UnknownIntegrationError(slug);
  }

  const effectiveMode: IntegrationMode = options.mode ?? row.mode;

  if (effectiveMode === 'disconnected') {
    throw new IntegrationNotConfiguredError(integrationSlug, effectiveMode);
  }

  if (!definition.modes.includes(effectiveMode)) {
    throw new IntegrationValidationError(
      integrationSlug,
      `Mode "${effectiveMode}" is not supported for ${definition.label}.`
    );
  }

  const cached = readCached(integrationSlug, effectiveMode);
  if (cached) {
    return cached;
  }

  let secrets = decryptModeSecrets(row, effectiveMode);
  let publicConfig = (row.public_config ?? {}) as IntegrationPublicConfig;

  const hasSecrets = Object.values(secrets).some(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

  if (!hasSecrets && options.fallbackEnv && integrationSlug === 'openloop') {
    const envSecrets = resolveOpenLoopEnvFallback(effectiveMode);
    if (envSecrets) {
      secrets = envSecrets;
      publicConfig = { ...resolveOpenLoopPublicConfigFromEnv(), ...publicConfig };
    }
  }

  const hasResolvedSecrets = Object.values(secrets).some(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

  if (!hasResolvedSecrets) {
    throw new IntegrationNotConfiguredError(integrationSlug, effectiveMode);
  }

  const parsedPublic = definition.publicConfigSchema.safeParse(publicConfig);
  if (!parsedPublic.success) {
    const message = parsedPublic.error.issues[0]?.message ?? 'Invalid public config.';
    throw new IntegrationValidationError(integrationSlug, message);
  }

  const parsedSecrets = definition.credentialSchema.safeParse(secrets);
  if (!parsedSecrets.success) {
    const message = parsedSecrets.error.issues[0]?.message ?? 'Invalid credentials.';
    throw new IntegrationValidationError(integrationSlug, message);
  }

  const resolved: ResolvedIntegration = {
    slug: integrationSlug,
    mode: effectiveMode,
    isEnabled: row.is_enabled,
    publicConfig: parsedPublic.data,
    secrets: parsedSecrets.data,
    encryptionKeyVersion: row.encryption_key_version,
  };

  writeCache(integrationSlug, effectiveMode, resolved);
  return resolved;
}
