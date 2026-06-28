import type {
  CreateChargeInput,
  CreateChargeResult,
  PaymentProviderId,
  RefundChargeInput,
  RefundChargeResult,
  VerifyWebhookInput,
  WebhookVerificationResult,
} from '../types';

/**
 * Gateway adapter contract for Sprint C financial routing.
 * Implementations must not be imported from client components.
 */
export interface PaymentProvider {
  readonly providerId: PaymentProviderId;

  /** Authorize or capture a payment. B2B adapters must persist attestationLogId on the transaction. */
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;

  /** Issue a full or partial refund against a prior transaction. */
  refundCharge(input: RefundChargeInput): Promise<RefundChargeResult>;

  /** Validate webhook authenticity and normalize the provider event payload. */
  verifyWebhook(input: VerifyWebhookInput): Promise<WebhookVerificationResult>;
}
