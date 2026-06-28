import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../../../lib/firebase/adminAuth.server';
import { getQuoteById } from '../../../../../../lib/firebase/quotes.server';
import { getModuleFlags } from '../../../../../../lib/firebase/modules.server';
import { renderQuoteHtml } from '../../../../../../lib/quotes/renderQuoteDocument';
import { ModuleDisabledError, requireB2BProcurement } from '../../../../../../lib/modules/b2b.server';

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

    const html = renderQuoteHtml(quote);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${quote.quoteNumber}.html"`,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Quote workflow module is disabled' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to render quote' }, { status: 500 });
  }
}
