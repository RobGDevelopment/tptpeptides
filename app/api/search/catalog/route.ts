import { NextResponse } from 'next/server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import { isAlgoliaConfigured, searchCatalog } from '../../../../lib/search/algolia.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isAlgoliaSearchEnabled')) {
    return NextResponse.json({ error: 'Catalog search is not enabled' }, { status: 404 });
  }

  if (!isAlgoliaConfigured()) {
    return NextResponse.json({ error: 'Algolia is not configured on the server' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const hits = await searchCatalog(query);
    return NextResponse.json({ hits });
  } catch (error) {
    console.error('[search/catalog] failed', error);
    return NextResponse.json({ error: 'Search unavailable' }, { status: 500 });
  }
}
