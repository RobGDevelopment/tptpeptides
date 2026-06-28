import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { createQuote, listQuotes } from '../../../../lib/firebase/quotes.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { adminQuoteCreateSchema } from '../../../../lib/schemas/quote';
import { ModuleDisabledError, requireB2BProcurement } from '../../../../lib/modules/b2b.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireB2BProcurement(flags, 'isQuoteWorkflowEnabled');

    const quotes = await listQuotes();
    return NextResponse.json({ quotes });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Quote workflow module is disabled' }, { status: 404 });
    }
    console.error('[admin/quotes] GET failed', error);
    return NextResponse.json({ error: 'Unable to load quotes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireB2BProcurement(flags, 'isQuoteWorkflowEnabled');

    const body = adminQuoteCreateSchema.parse(await request.json());
    const result = await createQuote(body, admin.uid);

    await logAdminAction({
      userId: admin.uid,
      action: 'quote_created',
      metadata: { quoteId: result.id, quoteNumber: result.quote.quoteNumber },
    });

    return NextResponse.json({ quote: { id: result.id, ...result.quote } });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Quote workflow module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid quote request' }, { status: 400 });
    }
    if (error instanceof Error && error.name === 'CheckoutValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[admin/quotes] POST failed', error);
    return NextResponse.json({ error: 'Unable to create quote' }, { status: 500 });
  }
}
