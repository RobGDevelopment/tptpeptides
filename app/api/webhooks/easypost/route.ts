import { NextResponse } from 'next/server';
import { createOpsException } from '../../../../lib/firebase/exceptions.server';
import { sendShippingNotificationEmail } from '../../../../lib/email/shippingNotification.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** EasyPost tracker webhook — scaffold; VERIFY WITH SANDBOX for event shape. */
export async function POST(request: Request) {
  const secret = process.env.EASYPOST_WEBHOOK_SECRET?.trim();
  if (secret) {
    const provided = request.headers.get('x-easypost-signature');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = payload.result as Record<string, unknown> | undefined;
  const tracker = (result?.tracker ?? payload.tracker) as Record<string, unknown> | undefined;
  const trackingCode = String(tracker?.tracking_code ?? payload.tracking_code ?? '');
  const status = String(tracker?.status ?? payload.status ?? '');
  const orderId = String(
    (tracker?.reference as string | undefined) ??
      (payload.metadata as Record<string, unknown> | undefined)?.orderId ??
      ''
  );

  try {
    if (status === 'in_transit' || status === 'out_for_delivery' || status === 'delivered') {
      const email = String(
        (payload.metadata as Record<string, unknown> | undefined)?.email ?? ''
      );
      if (email && orderId) {
        await sendShippingNotificationEmail({
          email,
          orderId,
          trackingNumber: trackingCode,
          carrier: String(tracker?.carrier ?? ''),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await createOpsException({
      type: 'tracking_webhook_failed',
      orderId: orderId || undefined,
      message: error instanceof Error ? error.message : 'EasyPost webhook failed',
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
