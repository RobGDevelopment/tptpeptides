import { NextResponse } from 'next/server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import {
  handleLexicalQuarantineHit,
  scanInboundMessage,
} from '../../../../lib/compliance/lexicalQuarantine.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Resend inbound email webhook scaffold — VERIFY WITH SANDBOX for payload shape. */
export async function POST(request: Request) {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isLexicalQuarantineEnabled')) {
    return NextResponse.json({ received: true, skipped: 'module disabled' });
  }

  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim();
  if (secret) {
    const provided = request.headers.get('x-resend-signature');
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

  const fromEmail = String(payload.from ?? payload.sender ?? 'unknown');
  const subject = String(payload.subject ?? '');
  const body = String(payload.text ?? payload.html ?? '');

  const scan = scanInboundMessage({ fromEmail, subject, body });
  const result = await handleLexicalQuarantineHit({ fromEmail, subject, body }, scan);

  return NextResponse.json({
    received: true,
    flagged: scan.flagged,
    matches: scan.matches,
    severity: scan.severity,
    userId: result.userId,
    refundedOrderIds: result.refundedOrderIds,
  });
}
