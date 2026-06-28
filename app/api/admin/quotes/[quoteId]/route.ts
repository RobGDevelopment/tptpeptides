import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getQuoteById, updateQuoteStatus } from '../../../../../lib/firebase/quotes.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { adminQuotePatchSchema } from '../../../../../lib/schemas/quote';
import { ModuleDisabledError, requireB2BProcurement } from '../../../../../lib/modules/b2b.server';
import { sendQuoteSentEmail } from '../../../../../lib/email/quotes.server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ quoteId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireB2BProcurement(flags, 'isQuoteWorkflowEnabled');

    const { quoteId } = await context.params;
    const quote = await getQuoteById(quoteId);
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Quote workflow module is disabled' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to load quote' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireB2BProcurement(flags, 'isQuoteWorkflowEnabled');

    const { quoteId } = await context.params;
    const body = adminQuotePatchSchema.parse(await request.json());

    const statusMap = {
      send: 'sent',
      accept: 'accepted',
      cancel: 'cancelled',
      expire: 'expired',
    } as const;

    const quote = await updateQuoteStatus(quoteId, statusMap[body.action]);
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (body.action === 'send') {
      await sendQuoteSentEmail({
        email: quote.customerEmail,
        customerName: quote.customerName,
        quoteNumber: quote.quoteNumber,
        quoteId,
        total: quote.total,
        validUntil: quote.validUntil,
      });
    }

    await logAdminAction({
      userId: admin.uid,
      action: `quote_${body.action}`,
      metadata: { quoteId, quoteNumber: quote.quoteNumber },
    });

    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Quote workflow module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid quote action' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update quote' }, { status: 500 });
  }
}
