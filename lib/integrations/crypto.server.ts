import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { IntegrationSecretPayload } from './types';
import { IntegrationDecryptError, MasterKeyNotConfiguredError } from './errors';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;

/** Wire format stored in secrets_ciphertext_* BYTEA columns. */
export type EncryptedSecretsBlob = {
  keyVersion: number;
  /** IV (12) + auth tag (16) + ciphertext */
  bytes: Buffer;
};

function readMasterKey(keyVersion: number): Buffer {
  if (keyVersion !== 1) {
    throw new IntegrationDecryptError(
      'platform',
      `Unsupported encryption_key_version ${keyVersion}. Only version 1 is configured.`
    );
  }

  const raw = process.env.INTEGRATIONS_MASTER_KEY?.trim();
  if (!raw) {
    throw new MasterKeyNotConfiguredError();
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new MasterKeyNotConfiguredError();
  }

  return key;
}

export function isIntegrationsMasterKeyConfigured(): boolean {
  const raw = process.env.INTEGRATIONS_MASTER_KEY?.trim();
  if (!raw) return false;

  try {
    return Buffer.from(raw, 'base64').length === KEY_LENGTH_BYTES;
  } catch {
    return false;
  }
}

export function assertMasterKeyConfigured(): void {
  readMasterKey(1);
}

export function encryptSecrets(
  payload: IntegrationSecretPayload,
  keyVersion = 1
): EncryptedSecretsBlob {
  const key = readMasterKey(keyVersion);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new IntegrationDecryptError('platform', 'Unexpected GCM auth tag length.');
  }

  return {
    keyVersion,
    bytes: Buffer.concat([iv, authTag, ciphertext]),
  };
}

export function decryptSecrets(
  blob: EncryptedSecretsBlob | Buffer | Uint8Array | null | undefined,
  keyVersion = 1
): IntegrationSecretPayload {
  if (blob == null) {
    throw new IntegrationDecryptError('platform', 'Ciphertext is empty.');
  }

  let bytes: Buffer;
  let version = keyVersion;

  if (Buffer.isBuffer(blob)) {
    bytes = blob;
  } else if (blob instanceof Uint8Array) {
    bytes = Buffer.from(blob);
  } else {
    bytes = blob.bytes;
    version = blob.keyVersion;
  }

  if (bytes.length < IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES + 1) {
    throw new IntegrationDecryptError('platform', 'Ciphertext is too short.');
  }

  const key = readMasterKey(version);
  const iv = bytes.subarray(0, IV_LENGTH_BYTES);
  const authTag = bytes.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
  const ciphertext = bytes.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8')) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new IntegrationDecryptError('platform', 'Decrypted payload is not a JSON object.');
    }

    return parsed as IntegrationSecretPayload;
  } catch (caught) {
    if (caught instanceof IntegrationDecryptError) {
      throw caught;
    }
    const detail = caught instanceof Error ? caught.message : 'decryption failed';
    throw new IntegrationDecryptError('platform', detail);
  }
}

/** Encode encrypted blob for Supabase BYTEA column insert/update. */
export function encryptedBlobToDbBytes(blob: EncryptedSecretsBlob): Buffer {
  return blob.bytes;
}

/** Decode BYTEA from Supabase into decrypt input. */
export function dbBytesToEncryptedBlob(
  bytes: Buffer | Uint8Array | string | null | undefined,
  keyVersion: number
): EncryptedSecretsBlob | null {
  if (bytes == null) return null;

  if (typeof bytes === 'string') {
    if (bytes.startsWith('\\x')) {
      return { keyVersion, bytes: Buffer.from(bytes.slice(2), 'hex') };
    }
    return { keyVersion, bytes: Buffer.from(bytes, 'base64') };
  }

  return { keyVersion, bytes: Buffer.from(bytes) };
}
