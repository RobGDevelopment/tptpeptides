import 'server-only';

/**
 * Order confirmation delivery.
 * Stripe sends the payment receipt email automatically when configured in the Dashboard.
 * This helper logs fulfillment for observability and can be extended with SendGrid/Resend later.
 */
export async function sendOrderConfirmationEmail(params: {
  email: string;
  orderId: string;
  total: number;
  loyaltyPointsAwarded?: number;
}): Promise<void> {
  console.info('[email] Order confirmation', {
    to: params.email,
    orderId: params.orderId,
    total: params.total,
    loyaltyPointsAwarded: params.loyaltyPointsAwarded ?? 0,
  });
}
