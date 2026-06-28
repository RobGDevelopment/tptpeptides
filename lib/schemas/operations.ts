import { z } from 'zod';

export const shippingProviderSchema = z.enum(['easypost', 'shipstation']);

export type ShippingProviderId = z.infer<typeof shippingProviderSchema>;

export const operationsSettingsSchema = z.object({
  shippingProvider: shippingProviderSchema.default('easypost'),
  autoPurchaseOrderEnabled: z.boolean().default(false),
  autoLabelOnPaidEnabled: z.boolean().default(false),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type OperationsSettings = z.infer<typeof operationsSettingsSchema>;

export const operationsSettingsPatchSchema = operationsSettingsSchema
  .omit({ updatedAt: true, updatedBy: true })
  .partial();

export type OperationsSettingsPatch = z.infer<typeof operationsSettingsPatchSchema>;

export const DEFAULT_OPERATIONS_SETTINGS: OperationsSettings = {
  shippingProvider: 'easypost',
  autoPurchaseOrderEnabled: false,
  autoLabelOnPaidEnabled: false,
};

export const supplierDocSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  poProtocol: z.enum(['email_pdf', 'edi_rest']).default('email_pdf'),
  ediEndpoint: z.string().url().optional(),
  active: z.boolean().default(true),
});

export type SupplierDoc = z.infer<typeof supplierDocSchema>;
