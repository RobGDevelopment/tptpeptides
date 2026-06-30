import { z } from 'zod';

/** When telehealth membership fees are captured relative to clinical approval. */
export const telehealthBillingStrategySchema = z.enum([
  'upfront_capture',
  'capture_on_approval',
]);

export type TelehealthBillingStrategy = z.infer<typeof telehealthBillingStrategySchema>;

export const DEFAULT_TELEHEALTH_BILLING_STRATEGY: TelehealthBillingStrategy = 'upfront_capture';

export const telehealthBillingStrategyLabels: Record<TelehealthBillingStrategy, string> = {
  upfront_capture: 'Upfront capture at intake',
  capture_on_approval: 'Capture on provider approval',
};
