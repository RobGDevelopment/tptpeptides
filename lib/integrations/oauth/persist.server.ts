import 'server-only';

import {
  dbBytesToEncryptedBlob,
  decryptSecrets,
  encryptSecrets,
  encryptedBlobToDbBytes,
} from '../crypto.server';
import { getIntegrationRow, invalidateIntegrationCache } from '../resolver.server';
import type {
  IntegrationPublicConfig,
  IntegrationSecretPayload,
  IntegrationSlug,
} from '../types';
import { createAdminClient } from '../../supabase/admin';

type PersistOAuthTokensInput = {
  slug: IntegrationSlug;
  mode: 'sandbox' | 'live';
  secrets: IntegrationSecretPayload;
  publicConfig?: IntegrationPublicConfig;
  actorAdminUid: string;
};

function mergeSecretPayload(
  existing: IntegrationSecretPayload,
  incoming: IntegrationSecretPayload
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

export async function persistIntegrationOAuthTokens(
  input: PersistOAuthTokensInput
): Promise<void> {
  const row = await getIntegrationRow(input.slug);
  if (!row) {
    throw new Error(`Integration row not found for "${input.slug}".`);
  }

  const column =
    input.mode === 'sandbox' ? 'secrets_ciphertext_sandbox' : 'secrets_ciphertext_live';

  let existingSecrets: IntegrationSecretPayload = {};
  const existingCiphertext = row[column as keyof typeof row];

  if (existingCiphertext) {
    const blob = dbBytesToEncryptedBlob(
      existingCiphertext as Buffer | Uint8Array | string,
      row.encryption_key_version
    );
    if (blob) {
      existingSecrets = decryptSecrets(blob, row.encryption_key_version);
    }
  }

  const mergedSecrets = mergeSecretPayload(existingSecrets, input.secrets);
  const encrypted = encryptSecrets(mergedSecrets, row.encryption_key_version);

  const publicConfig = input.publicConfig
    ? { ...((row.public_config ?? {}) as IntegrationPublicConfig), ...input.publicConfig }
    : (row.public_config as IntegrationPublicConfig | null) ?? {};

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('platform_integrations')
    .update({
      mode: input.mode,
      is_enabled: true,
      [column]: encryptedBlobToDbBytes(encrypted),
      encryption_key_version: encrypted.keyVersion,
      public_config: publicConfig,
      updated_by: input.actorAdminUid,
    })
    .eq('id', row.id);

  if (error) {
    throw new Error(error.message);
  }

  invalidateIntegrationCache(input.slug);

  await supabase.from('platform_integration_audit_log').insert({
    integration_id: row.id,
    action: 'oauth_connected',
    actor_admin_uid: input.actorAdminUid,
    metadata: { mode: input.mode },
  });
}
