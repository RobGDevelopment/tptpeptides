import type { IntegrationPublicConfig, IntegrationSecretPayload, IntegrationSlug } from './types';

export const SECRET_FIELD_LABELS: Record<keyof IntegrationSecretPayload, string> = {
  apiKey: 'API Key',
  apiSecret: 'API Secret',
  clientId: 'Client ID',
  clientSecret: 'Client Secret',
  accessToken: 'Access Token',
  refreshToken: 'Refresh Token',
  webhookSigningSecret: 'Webhook Signing Secret',
  webhookSecret: 'Webhook Secret',
  privateKey: 'Private Key',
  webhookUrl: 'Webhook URL',
};

export const PUBLIC_CONFIG_FIELD_LABELS: Record<keyof IntegrationPublicConfig, string> = {
  baseUrl: 'API Base URL',
  accountId: 'Account ID',
  accountSid: 'Account SID',
  merchantId: 'Merchant ID',
  locationId: 'Location ID',
  realmId: 'Realm ID',
  templateId: 'Template ID',
  fromEmail: 'From Email',
  webhookPath: 'Webhook Path',
  channelId: 'Channel ID',
};

export const PUBLIC_CONFIG_FIELDS: Partial<
  Record<IntegrationSlug, (keyof IntegrationPublicConfig)[]>
> = {
  openloop: ['baseUrl', 'webhookPath'],
  rupa_health: ['baseUrl', 'webhookPath'],
  fullscript: ['baseUrl', 'webhookPath'],
  nmi: ['baseUrl', 'merchantId', 'webhookPath'],
  two_accept: ['baseUrl', 'merchantId', 'webhookPath'],
  quickbooks_online: ['realmId', 'webhookPath'],
  gohighlevel: ['locationId', 'webhookPath'],
  twilio: ['accountSid', 'webhookPath'],
  resend: ['fromEmail', 'webhookPath'],
  persona: ['baseUrl', 'templateId', 'webhookPath'],
  slack: ['channelId', 'webhookPath'],
};

export const CATEGORY_LABELS = {
  fulfillment: 'Fulfillment',
  financial: 'Financial',
  crm_comms: 'CRM & Comms',
  compliance: 'Compliance',
  ops: 'Ops',
} as const;

export const MODE_LABELS = {
  disconnected: 'Disconnected',
  sandbox: 'Sandbox',
  live: 'Live',
} as const;
