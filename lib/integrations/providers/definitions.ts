import type { IntegrationDefinition } from '../types';
import {
  apiKeyPairSecretSchema,
  apiKeySecretSchema,
  gohighlevelPublicConfigSchema,
  integrationSecretPayloadSchema,
  integrationPublicConfigSchema,
  nmiPublicConfigSchema,
  openLoopPublicConfigSchema,
  personaPublicConfigSchema,
  quickbooksPublicConfigSchema,
  resendPublicConfigSchema,
  slackSecretSchema,
  twilioPublicConfigSchema,
} from '../schemas/credentials';

export const openLoopIntegrationDefinition: IntegrationDefinition = {
  slug: 'openloop',
  label: 'OpenLoop',
  category: 'fulfillment',
  description:
    'MSO fulfillment dispatch for physician-reviewed prescriptions and compounding pharmacy routing.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: apiKeySecretSchema,
  publicConfigSchema: openLoopPublicConfigSchema,
  requiredSecrets: {
    sandbox: ['apiKey'],
    live: ['apiKey'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
  docsUrl: 'https://docs.openloop.example.com',
};

export const rupaHealthIntegrationDefinition: IntegrationDefinition = {
  slug: 'rupa_health',
  label: 'Rupa Health',
  category: 'fulfillment',
  description: 'Lab ordering and biomarker fulfillment for longevity protocols.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: apiKeySecretSchema,
  publicConfigSchema: integrationPublicConfigSchema.pick({ baseUrl: true, webhookPath: true }),
  requiredSecrets: {
    sandbox: ['apiKey'],
    live: ['apiKey'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};

export const fullscriptIntegrationDefinition: IntegrationDefinition = {
  slug: 'fullscript',
  label: 'Fullscript',
  category: 'fulfillment',
  description: 'Supplement and wellness product dispensing integrations.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: apiKeySecretSchema,
  publicConfigSchema: integrationPublicConfigSchema.pick({ baseUrl: true, webhookPath: true }),
  requiredSecrets: {
    sandbox: ['apiKey'],
    live: ['apiKey'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};

export const nmiIntegrationDefinition: IntegrationDefinition = {
  slug: 'nmi',
  label: 'NMI',
  category: 'financial',
  description: 'High-risk card processing and recurring membership billing.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: apiKeyPairSecretSchema,
  publicConfigSchema: nmiPublicConfigSchema,
  requiredSecrets: {
    sandbox: ['apiKey'],
    live: ['apiKey', 'apiSecret'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};

export const twoAcceptIntegrationDefinition: IntegrationDefinition = {
  slug: 'two_accept',
  label: '2Accept',
  category: 'financial',
  description: 'Alternate high-risk payment gateway for telehealth memberships.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: apiKeyPairSecretSchema,
  publicConfigSchema: nmiPublicConfigSchema,
  requiredSecrets: {
    sandbox: ['apiKey'],
    live: ['apiKey', 'apiSecret'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};

export const quickbooksOnlineIntegrationDefinition: IntegrationDefinition = {
  slug: 'quickbooks_online',
  label: 'QuickBooks Online',
  category: 'financial',
  description: 'Accounting sync and journal entry export for B2B and clinic revenue.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: integrationSecretPayloadSchema.pick({
    clientId: true,
    clientSecret: true,
    accessToken: true,
    refreshToken: true,
  }),
  publicConfigSchema: quickbooksPublicConfigSchema,
  requiredSecrets: {
    live: ['accessToken'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};

export const gohighlevelIntegrationDefinition: IntegrationDefinition = {
  slug: 'gohighlevel',
  label: 'GoHighLevel',
  category: 'crm_comms',
  description: 'CRM automations, pipelines, and patient nurture workflows.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: integrationSecretPayloadSchema.pick({
    clientId: true,
    clientSecret: true,
    accessToken: true,
    refreshToken: true,
  }),
  publicConfigSchema: gohighlevelPublicConfigSchema,
  requiredSecrets: {
    live: ['accessToken'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};

export const twilioIntegrationDefinition: IntegrationDefinition = {
  slug: 'twilio',
  label: 'Twilio',
  category: 'crm_comms',
  description: 'SMS notifications and two-factor patient communications.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: apiKeyPairSecretSchema,
  publicConfigSchema: twilioPublicConfigSchema,
  requiredSecrets: {
    sandbox: ['apiKey', 'apiSecret'],
    live: ['apiKey', 'apiSecret'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};

export const resendIntegrationDefinition: IntegrationDefinition = {
  slug: 'resend',
  label: 'Resend',
  category: 'crm_comms',
  description: 'Transactional email delivery and inbound parsing.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: apiKeySecretSchema,
  publicConfigSchema: resendPublicConfigSchema,
  requiredSecrets: {
    sandbox: ['apiKey'],
    live: ['apiKey'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};

export const personaIntegrationDefinition: IntegrationDefinition = {
  slug: 'persona',
  label: 'Persona',
  category: 'compliance',
  description: 'Identity verification for high-net-worth patient onboarding.',
  availability: 'active',
  modes: ['disconnected', 'sandbox', 'live'],
  credentialSchema: apiKeySecretSchema,
  publicConfigSchema: personaPublicConfigSchema,
  requiredSecrets: {
    sandbox: ['apiKey'],
    live: ['apiKey'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};

export const slackIntegrationDefinition: IntegrationDefinition = {
  slug: 'slack',
  label: 'Slack',
  category: 'ops',
  description: 'Ops alerts and SLA notifications via incoming webhooks.',
  availability: 'active',
  modes: ['disconnected', 'live'],
  credentialSchema: slackSecretSchema,
  publicConfigSchema: integrationPublicConfigSchema.pick({ channelId: true, webhookPath: true }),
  requiredSecrets: {
    live: ['webhookUrl'],
  },
  supportsWebhooks: true,
  supportsConnectionTest: true,
};
