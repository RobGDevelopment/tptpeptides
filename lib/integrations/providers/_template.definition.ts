/**
 * Template for adding a new integration provider.
 *
 * 1. Add slug to IntegrationSlug + INTEGRATION_SLUGS in ../types.ts
 * 2. Copy a definition block below into providers/definitions.ts
 * 3. Register in ../registry.ts
 * 4. Add seed row in supabase/migrations (or INSERT via admin seed script)
 * 5. Implement adapter in providers/<slug>.adapter.ts (Phase 4+)
 *
 * @example
 * export const acmeIntegrationDefinition: IntegrationDefinition = {
 *   slug: 'acme',
 *   label: 'Acme Labs',
 *   category: 'fulfillment',
 *   description: '...',
 *   availability: 'active',
 *   modes: ['disconnected', 'sandbox', 'live'],
 *   credentialSchema: apiKeySecretSchema,
 *   publicConfigSchema: integrationPublicConfigSchema.pick({ baseUrl: true }),
 *   requiredSecrets: { sandbox: ['apiKey'], live: ['apiKey'] },
 *   supportsWebhooks: true,
 *   supportsConnectionTest: true,
 * };
 */
export {};
