import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getCatalogSummaries } from '../../../../../lib/firebase/products.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';
import { isAlgoliaConfigured, reindexCatalog } from '../../../../../lib/search/algolia.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    if (!isModuleEnabled(flags, 'isAlgoliaSearchEnabled')) {
      return NextResponse.json({ error: 'Algolia search module is disabled' }, { status: 404 });
    }

    if (!isAlgoliaConfigured()) {
      return NextResponse.json(
        {
          error:
            'Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY in Vercel before reindexing. See /admin/rollout → Phase 5.',
        },
        { status: 503 }
      );
    }

    const products = await getCatalogSummaries();
    const indexed = await reindexCatalog(products);
    return NextResponse.json({ ok: true, indexed });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[admin/search/reindex] failed', error);
    return NextResponse.json({ error: 'Unable to reindex catalog' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    return NextResponse.json({
      enabled: isModuleEnabled(flags, 'isAlgoliaSearchEnabled'),
      configured: isAlgoliaConfigured(),
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to load search status' }, { status: 500 });
  }
}
