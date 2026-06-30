import type { z } from 'zod';

export type IntegrationMode = 'disconnected' | 'sandbox' | 'live';

export type IntegrationCategory =
  | 'fulfillment'
  | 'financial'
  | 'crm_comms'
  | 'compliance'
  | 'ops';

/** Stable slug — matches platform_integrations.slug and registry key */
export type IntegrationSlug =
  | 'openloop'
  | 'rupa_health'
  | 'fullscript'
  | 'nmi'
  | 'two_accept'
  | 'quickbooks_online'
  | 'gohighlevel'
  | 'twilio'
  | 'resend'
  | 'persona'
  | 'slack';

export const INTEGRATION_SLUGS = [
  'openloop',
  'rupa_health',
  'fullscript',
  'nmi',
  'two_accept',
  'quickbooks_online',
  'gohighlevel',
  'twilio',
  'resend',
  'persona',
  'slack',
] as const satisfies readonly IntegrationSlug[];

export type IntegrationAvailability = 'active' | 'coming_soon';

/** Non-secret config — stored as plaintext public_config JSONB */
export type IntegrationPublicConfig = {
  baseUrl?: string;
  accountId?: string;
  accountSid?: string;
  merchantId?: string;
  locationId?: string;
  realmId?: string;
  templateId?: string;
  fromEmail?: string;
  webhookPath?: string;
  channelId?: string;
  [key: string]: unknown;
};

/** Secret fields — encrypted as one JSON blob per mode */
export type IntegrationSecretPayload = {
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookSigningSecret?: string;
  webhookSecret?: string;
  privateKey?: string;
  webhookUrl?: string;
};

export type IntegrationDefinition = {
  slug: IntegrationSlug;
  label: string;
  category: IntegrationCategory;
  description: string;
  availability: IntegrationAvailability;
  modes: IntegrationMode[];
  credentialSchema: z.ZodType<IntegrationSecretPayload>;
  publicConfigSchema: z.ZodType<IntegrationPublicConfig>;
  requiredSecrets: {
    sandbox?: (keyof IntegrationSecretPayload)[];
    live: (keyof IntegrationSecretPayload)[];
  };
  supportsWebhooks: boolean;
  supportsConnectionTest: boolean;
  docsUrl?: string;
};

/** Decrypted integration row for server adapters (Phase 4 resolver). */
export type ResolvedIntegration<TSecrets extends IntegrationSecretPayload = IntegrationSecretPayload> =
  {
    slug: IntegrationSlug;
    mode: IntegrationMode;
    isEnabled: boolean;
    publicConfig: IntegrationPublicConfig;
    secrets: TSecrets;
    encryptionKeyVersion: number;
  };

export type ConnectionTestResult =
  | { ok: true; detail?: string }
  | { ok: false; error: string };

export interface IntegrationAdapter<TSecrets extends IntegrationSecretPayload = IntegrationSecretPayload> {
  slug: IntegrationSlug;
  testConnection(resolved: ResolvedIntegration<TSecrets>): Promise<ConnectionTestResult>;
  verifyWebhook?(
    request: Request,
    resolved: ResolvedIntegration<TSecrets>
  ): Promise<boolean>;
}
