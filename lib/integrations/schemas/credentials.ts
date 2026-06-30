import { z } from 'zod';

/** Shared secret field shapes — providers compose subsets via .pick() / .extend() */
export const integrationSecretPayloadSchema = z.object({
  apiKey: z.string().min(1).max(2000).optional(),
  apiSecret: z.string().min(1).max(2000).optional(),
  clientId: z.string().min(1).max(500).optional(),
  clientSecret: z.string().min(1).max(2000).optional(),
  accessToken: z.string().min(1).max(4000).optional(),
  refreshToken: z.string().min(1).max(4000).optional(),
  webhookSigningSecret: z.string().min(1).max(2000).optional(),
  webhookSecret: z.string().min(1).max(2000).optional(),
  privateKey: z.string().min(1).max(8000).optional(),
  webhookUrl: z.string().url().max(2000).optional(),
});

export const integrationPublicConfigSchema = z
  .object({
    baseUrl: z.string().url().max(500).optional(),
    accountId: z.string().max(200).optional(),
    accountSid: z.string().max(200).optional(),
    merchantId: z.string().max(200).optional(),
    locationId: z.string().max(200).optional(),
    realmId: z.string().max(200).optional(),
    templateId: z.string().max(200).optional(),
    fromEmail: z.string().email().max(320).optional(),
    webhookPath: z.string().max(200).optional(),
    channelId: z.string().max(200).optional(),
  })
  .passthrough();

export const apiKeySecretSchema = integrationSecretPayloadSchema.pick({
  apiKey: true,
  webhookSigningSecret: true,
});

export const apiKeyPairSecretSchema = integrationSecretPayloadSchema.pick({
  apiKey: true,
  apiSecret: true,
  webhookSigningSecret: true,
});

export const slackSecretSchema = integrationSecretPayloadSchema.pick({
  webhookUrl: true,
  webhookSigningSecret: true,
});

export const openLoopPublicConfigSchema = integrationPublicConfigSchema.pick({
  baseUrl: true,
  webhookPath: true,
});

export const resendPublicConfigSchema = integrationPublicConfigSchema.pick({
  fromEmail: true,
  webhookPath: true,
});

export const nmiPublicConfigSchema = integrationPublicConfigSchema.pick({
  baseUrl: true,
  merchantId: true,
  webhookPath: true,
});

export const twilioPublicConfigSchema = integrationPublicConfigSchema.pick({
  accountSid: true,
  webhookPath: true,
});

export const personaPublicConfigSchema = integrationPublicConfigSchema.pick({
  baseUrl: true,
  templateId: true,
  webhookPath: true,
});

export const quickbooksPublicConfigSchema = integrationPublicConfigSchema.pick({
  realmId: true,
  webhookPath: true,
});

export const gohighlevelPublicConfigSchema = integrationPublicConfigSchema.pick({
  locationId: true,
  webhookPath: true,
});
