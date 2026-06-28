import { handlePaymentProviderWebhook } from '../../../../lib/payments/webhookHandler.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handlePaymentProviderWebhook(request, 'seamlesschex');
}
