import { z } from 'zod';
import { INTEGRATION_SLUGS } from '../integrations/types';

export const integrationModeSchema = z.enum(['disconnected', 'sandbox', 'live']);

export const integrationCategorySchema = z.enum([
  'fulfillment',
  'financial',
  'crm_comms',
  'compliance',
  'ops',
]);

export const integrationSlugSchema = z.enum(INTEGRATION_SLUGS);

export const integrationAvailabilitySchema = z.enum(['active', 'coming_soon']);

export const integrationLastTestStatusSchema = z.enum(['success', 'failed']);

/** DB row shape (no decrypted secrets). */
export const platformIntegrationRowSchema = z.object({
  id: z.string().uuid(),
  slug: integrationSlugSchema,
  category: integrationCategorySchema,
  mode: integrationModeSchema,
  is_enabled: z.boolean(),
  public_config: z.record(z.string(), z.unknown()),
  secrets_ciphertext_sandbox: z.unknown().nullable(),
  secrets_ciphertext_live: z.unknown().nullable(),
  encryption_key_version: z.number().int().positive(),
  last_tested_at: z.string().datetime().nullable(),
  last_test_status: integrationLastTestStatusSchema.nullable(),
  last_test_error: z.string().nullable(),
  updated_by: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type PlatformIntegrationRow = z.infer<typeof platformIntegrationRowSchema>;

/** Admin-safe list item (Phase 5+). */
export const platformIntegrationListItemSchema = z.object({
  slug: integrationSlugSchema,
  label: z.string(),
  category: integrationCategorySchema,
  availability: integrationAvailabilitySchema,
  mode: integrationModeSchema,
  isEnabled: z.boolean(),
  supportsConnectionTest: z.boolean(),
  lastTestedAt: z.string().datetime().nullable(),
  lastTestStatus: integrationLastTestStatusSchema.nullable(),
  hasSandboxSecrets: z.boolean(),
  hasLiveSecrets: z.boolean(),
});

export type PlatformIntegrationListItem = z.infer<typeof platformIntegrationListItemSchema>;

export const platformIntegrationMaskedSecretsSchema = z.record(z.string(), z.string());

export const platformIntegrationDetailSchema = z.object({
  slug: integrationSlugSchema,
  label: z.string(),
  category: integrationCategorySchema,
  description: z.string(),
  availability: integrationAvailabilitySchema,
  mode: integrationModeSchema,
  isEnabled: z.boolean(),
  supportsWebhooks: z.boolean(),
  supportsConnectionTest: z.boolean(),
  supportedModes: z.array(integrationModeSchema),
  publicConfig: z.record(z.string(), z.unknown()),
  hasSandboxSecrets: z.boolean(),
  hasLiveSecrets: z.boolean(),
  maskedSecrets: z.object({
    sandbox: platformIntegrationMaskedSecretsSchema,
    live: platformIntegrationMaskedSecretsSchema,
  }),
  lastTestedAt: z.string().datetime().nullable(),
  lastTestStatus: integrationLastTestStatusSchema.nullable(),
  lastTestError: z.string().nullable(),
  updatedAt: z.string().datetime(),
});

export type PlatformIntegrationDetail = z.infer<typeof platformIntegrationDetailSchema>;

export const updateIntegrationModeSchema = z.object({
  slug: integrationSlugSchema,
  mode: integrationModeSchema,
});

export const toggleIntegrationEnabledSchema = z.object({
  slug: integrationSlugSchema,
  isEnabled: z.boolean(),
});

export const saveIntegrationPublicConfigSchema = z.object({
  slug: integrationSlugSchema,
  publicConfig: z.record(z.string(), z.unknown()),
});

export const saveIntegrationSecretsSchema = z.object({
  slug: integrationSlugSchema,
  mode: z.enum(['sandbox', 'live']),
  secrets: z.record(z.string(), z.unknown()),
});

export const integrationAuditActionSchema = z.enum([
  'mode_changed',
  'secrets_rotated',
  'public_config_updated',
  'test_connection',
  'oauth_connected',
  'enabled',
  'disabled',
]);

export const platformIntegrationAuditLogRowSchema = z.object({
  id: z.string().uuid(),
  integration_id: z.string().uuid(),
  action: z.string(),
  actor_admin_uid: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
});

export type PlatformIntegrationAuditLogRow = z.infer<typeof platformIntegrationAuditLogRowSchema>;
