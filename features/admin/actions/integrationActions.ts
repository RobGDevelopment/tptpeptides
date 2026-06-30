'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { AdminAuthError, requireAdminSession } from '../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';
import { runIntegrationConnectionTest } from '../../../lib/integrations/connectionTest.server';
import {
  dbBytesToEncryptedBlob,
  decryptSecrets,
  encryptSecrets,
  encryptedBlobToDbBytes,
  isIntegrationsMasterKeyConfigured,
} from '../../../lib/integrations/crypto.server';
import { maskSecretPayload } from '../../../lib/integrations/maskSecrets.server';
import {
  getIntegrationDefinition,
  isIntegrationSlug,
} from '../../../lib/integrations/registry';
import {
  getIntegrationRow,
  invalidateIntegrationCache,
  listIntegrationRows,
  resolveIntegration,
} from '../../../lib/integrations/resolver.server';
import type { IntegrationMode, IntegrationSecretPayload, IntegrationSlug } from '../../../lib/integrations/types';
import {
  integrationSlugSchema,
  saveIntegrationPublicConfigSchema,
  saveIntegrationSecretsSchema,
  updateIntegrationModeSchema,
  type PlatformIntegrationDetail,
  type PlatformIntegrationListItem,
} from '../../../lib/schemas/platformIntegrations';
import { createAdminClient } from '../../../lib/supabase/admin';

const INTEGRATIONS_ADMIN_PATH = '/admin/settings/integrations';

type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

type PlatformIntegrationRow = NonNullable<Awaited<ReturnType<typeof getIntegrationRow>>>;

async function assertWellnessAdminAccess(): Promise<string> {
  const headersList = await headers();
  const request = new Request('http://internal/admin/settings/integrations', {
    headers: headersList,
  });

  const session = await requireAdminSession(request);

  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    throw new AdminAuthError('Wellness module is not enabled.', 403);
  }

  return session.uid;
}

async function writeIntegrationAuditLog(input: {
  integrationId: string;
  action: string;
  actorAdminUid: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('platform_integration_audit_log').insert({
    integration_id: input.integrationId,
    action: input.action,
    actor_admin_uid: input.actorAdminUid,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error('[integrationActions] audit log insert failed', error.message);
  }
}

function hasCiphertext(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.length > 0;
  if (Buffer.isBuffer(value)) return value.length > 0;
  if (value instanceof Uint8Array) return value.length > 0;
  return true;
}

function decryptSecretsForMasking(
  row: PlatformIntegrationRow,
  mode: 'sandbox' | 'live'
): IntegrationSecretPayload {
  const ciphertext =
    mode === 'sandbox' ? row.secrets_ciphertext_sandbox : row.secrets_ciphertext_live;

  if (!hasCiphertext(ciphertext)) {
    return {};
  }

  try {
    const blob = dbBytesToEncryptedBlob(ciphertext, row.encryption_key_version);
    if (!blob) return {};
    return decryptSecrets(blob, row.encryption_key_version);
  } catch {
    return {};
  }
}

function mergeSecretPayload(
  existing: IntegrationSecretPayload,
  incoming: Record<string, unknown>
): IntegrationSecretPayload {
  const merged: IntegrationSecretPayload = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    merged[key as keyof IntegrationSecretPayload] = trimmed;
  }

  return merged;
}

function mapListItem(
  row: PlatformIntegrationRow
): PlatformIntegrationListItem {
  const definition = getIntegrationDefinition(row.slug);

  return {
    slug: definition.slug,
    label: definition.label,
    category: definition.category,
    availability: definition.availability,
    mode: row.mode,
    isEnabled: row.is_enabled,
    supportsConnectionTest: definition.supportsConnectionTest,
    lastTestedAt: row.last_tested_at ?? null,
    lastTestStatus: row.last_test_status ?? null,
    hasSandboxSecrets: hasCiphertext(row.secrets_ciphertext_sandbox),
    hasLiveSecrets: hasCiphertext(row.secrets_ciphertext_live),
  };
}

function mapDetail(row: PlatformIntegrationRow): PlatformIntegrationDetail {
  const definition = getIntegrationDefinition(row.slug);

  return {
    slug: definition.slug,
    label: definition.label,
    category: definition.category,
    description: definition.description,
    availability: definition.availability,
    mode: row.mode,
    isEnabled: row.is_enabled,
    supportsWebhooks: definition.supportsWebhooks,
    supportsConnectionTest: definition.supportsConnectionTest,
    supportedModes: definition.modes,
    publicConfig: (row.public_config ?? {}) as Record<string, unknown>,
    hasSandboxSecrets: hasCiphertext(row.secrets_ciphertext_sandbox),
    hasLiveSecrets: hasCiphertext(row.secrets_ciphertext_live),
    maskedSecrets: {
      sandbox: maskSecretPayload(decryptSecretsForMasking(row, 'sandbox')),
      live: maskSecretPayload(decryptSecretsForMasking(row, 'live')),
    },
    lastTestedAt: row.last_tested_at ?? null,
    lastTestStatus: row.last_test_status ?? null,
    lastTestError: row.last_test_error ?? null,
    updatedAt: row.updated_at,
  };
}

function resolveConnectionTestMode(row: PlatformIntegrationRow): Exclude<IntegrationMode, 'disconnected'> {
  if (row.mode === 'sandbox' || row.mode === 'live') {
    return row.mode;
  }

  if (hasCiphertext(row.secrets_ciphertext_sandbox)) {
    return 'sandbox';
  }

  if (hasCiphertext(row.secrets_ciphertext_live)) {
    return 'live';
  }

  throw new Error('No credentials configured to test.');
}

export async function listIntegrations(): Promise<PlatformIntegrationListItem[]> {
  await assertWellnessAdminAccess();

  const rows = await listIntegrationRows();
  return rows
    .filter((row) => isIntegrationSlug(row.slug))
    .map((row) => mapListItem(row as PlatformIntegrationRow));
}

export async function getIntegrationDetail(slug: string): Promise<PlatformIntegrationDetail> {
  await assertWellnessAdminAccess();

  const parsedSlug = integrationSlugSchema.parse(slug);
  const row = await getIntegrationRow(parsedSlug);

  if (!row) {
    throw new Error(`Integration "${parsedSlug}" is not registered in the database.`);
  }

  return mapDetail(row);
}

export async function updateIntegrationMode(
  slug: string,
  mode: IntegrationMode
): Promise<ActionResult<{ mode: IntegrationMode }>> {
  try {
    const actorUid = await assertWellnessAdminAccess();
    const parsed = updateIntegrationModeSchema.parse({ slug, mode });
    const definition = getIntegrationDefinition(parsed.slug);

    if (!definition.modes.includes(parsed.mode)) {
      return { ok: false, error: `${definition.label} does not support mode "${parsed.mode}".` };
    }

    const row = await getIntegrationRow(parsed.slug);
    if (!row) {
      return { ok: false, error: 'Integration row not found.' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('platform_integrations')
      .update({
        mode: parsed.mode,
        updated_by: actorUid,
      })
      .eq('id', row.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    invalidateIntegrationCache(parsed.slug);

    await writeIntegrationAuditLog({
      integrationId: row.id,
      action: 'mode_changed',
      actorAdminUid: actorUid,
      metadata: { modeBefore: row.mode, modeAfter: parsed.mode },
    });

    revalidatePath(INTEGRATIONS_ADMIN_PATH);
    return { ok: true, data: { mode: parsed.mode } };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unable to update integration mode.';
    return { ok: false, error: message };
  }
}

export async function saveIntegrationSecrets(input: {
  slug: string;
  mode: 'sandbox' | 'live';
  secrets: Record<string, unknown>;
}): Promise<ActionResult> {
  try {
    const actorUid = await assertWellnessAdminAccess();

    if (!isIntegrationsMasterKeyConfigured()) {
      return {
        ok: false,
        error: 'INTEGRATIONS_MASTER_KEY is not configured on the server.',
      };
    }

    const parsed = saveIntegrationSecretsSchema.parse(input);
    const definition = getIntegrationDefinition(parsed.slug);

    if (definition.availability === 'coming_soon') {
      return { ok: false, error: `${definition.label} is coming soon.` };
    }

    const row = await getIntegrationRow(parsed.slug);
    if (!row) {
      return { ok: false, error: 'Integration row not found.' };
    }

    const existing = decryptSecretsForMasking(row, parsed.mode);
    const merged = mergeSecretPayload(existing, parsed.secrets);
    const validated = definition.credentialSchema.safeParse(merged);

    if (!validated.success) {
      const message = validated.error.issues[0]?.message ?? 'Invalid credentials.';
      return { ok: false, error: message };
    }

    const encrypted = encryptSecrets(validated.data, row.encryption_key_version);
    const column =
      parsed.mode === 'sandbox' ? 'secrets_ciphertext_sandbox' : 'secrets_ciphertext_live';

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('platform_integrations')
      .update({
        [column]: encryptedBlobToDbBytes(encrypted),
        encryption_key_version: encrypted.keyVersion,
        updated_by: actorUid,
      })
      .eq('id', row.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    invalidateIntegrationCache(parsed.slug);

    await writeIntegrationAuditLog({
      integrationId: row.id,
      action: 'secrets_rotated',
      actorAdminUid: actorUid,
      metadata: { mode: parsed.mode },
    });

    revalidatePath(INTEGRATIONS_ADMIN_PATH);
    return { ok: true };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unable to save integration secrets.';
    return { ok: false, error: message };
  }
}

export async function saveIntegrationPublicConfig(input: {
  slug: string;
  publicConfig: Record<string, unknown>;
}): Promise<ActionResult> {
  try {
    const actorUid = await assertWellnessAdminAccess();
    const parsed = saveIntegrationPublicConfigSchema.parse(input);
    const definition = getIntegrationDefinition(parsed.slug);

    const validated = definition.publicConfigSchema.safeParse(parsed.publicConfig);
    if (!validated.success) {
      const message = validated.error.issues[0]?.message ?? 'Invalid public configuration.';
      return { ok: false, error: message };
    }

    const row = await getIntegrationRow(parsed.slug);
    if (!row) {
      return { ok: false, error: 'Integration row not found.' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('platform_integrations')
      .update({
        public_config: validated.data,
        updated_by: actorUid,
      })
      .eq('id', row.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    invalidateIntegrationCache(parsed.slug);

    await writeIntegrationAuditLog({
      integrationId: row.id,
      action: 'public_config_updated',
      actorAdminUid: actorUid,
    });

    revalidatePath(INTEGRATIONS_ADMIN_PATH);
    return { ok: true };
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : 'Unable to save integration public config.';
    return { ok: false, error: message };
  }
}

export async function testIntegrationConnection(
  slug: string
): Promise<ActionResult<{ detail?: string }>> {
  try {
    const actorUid = await assertWellnessAdminAccess();
    const parsedSlug = integrationSlugSchema.parse(slug);
    const definition = getIntegrationDefinition(parsedSlug);

    if (definition.availability === 'coming_soon') {
      return { ok: false, error: `${definition.label} is coming soon.` };
    }

    if (!definition.supportsConnectionTest) {
      return { ok: false, error: 'Connection test is not available for this integration.' };
    }

    const row = await getIntegrationRow(parsedSlug);
    if (!row) {
      return { ok: false, error: 'Integration row not found.' };
    }

    const testMode = resolveConnectionTestMode(row);
    const resolved = await resolveIntegration(parsedSlug, { mode: testMode });

    const result = await runIntegrationConnectionTest(parsedSlug, resolved);
    const testedAt = new Date().toISOString();

    const supabase = createAdminClient();
    await supabase
      .from('platform_integrations')
      .update({
        last_tested_at: testedAt,
        last_test_status: result.ok ? 'success' : 'failed',
        last_test_error: result.ok ? null : result.error,
        updated_by: actorUid,
      })
      .eq('id', row.id);

    await writeIntegrationAuditLog({
      integrationId: row.id,
      action: 'test_connection',
      actorAdminUid: actorUid,
      metadata: { ok: result.ok, mode: testMode },
    });

    revalidatePath(INTEGRATIONS_ADMIN_PATH);

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, data: { detail: result.detail } };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Connection test failed.';
    return { ok: false, error: message };
  }
}
