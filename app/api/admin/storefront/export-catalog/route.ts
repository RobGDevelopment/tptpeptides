import { NextResponse } from 'next/server';
import { getCatalogEntries } from '../../../../../lib/catalog';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../lib/firebase/admin';
import { productDocSchema } from '../../../../../lib/schemas/product';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const snapshot = await getAdminFirestore().collection('products').get();
    const byCatalog = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        description: string;
        researchAreas: string[];
        variants: { id: string; dose: string; baseCost: number | null; retailPrice: number | null }[];
      }
    >();

    for (const doc of snapshot.docs) {
      const parsed = productDocSchema.safeParse(doc.data());
      if (!parsed.success) continue;

      const catalogId = parsed.data.catalogId ?? doc.id;
      const entry = byCatalog.get(catalogId) ?? {
        id: catalogId,
        name: parsed.data.name,
        category: parsed.data.category ?? 'Uncategorized',
        description: parsed.data.desc,
        researchAreas: parsed.data.researchAreas ?? [],
        variants: [],
      };

      entry.variants.push({
        id: doc.id,
        dose: parsed.data.tag,
        baseCost: parsed.data.baseCost ?? null,
        retailPrice: parsed.data.active ? parsed.data.price : null,
      });

      byCatalog.set(catalogId, entry);
    }

    const fromFirestore = [...byCatalog.values()].sort((a, b) => a.name.localeCompare(b.name));

    const exportData =
      fromFirestore.length > 0
        ? fromFirestore
        : getCatalogEntries().map((entry) => ({
            id: entry.id,
            name: entry.name,
            category: entry.category,
            description: entry.description,
            researchAreas: entry.researchAreas,
            variants: entry.variants.map((variant) => ({
              id: variant.id,
              dose: variant.dose,
              baseCost: variant.baseCost,
              retailPrice: variant.retailPrice,
            })),
          }));

    await logAdminAction({
      userId: admin.uid,
      action: 'catalog_export',
      metadata: { compoundCount: exportData.length },
    });

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': 'attachment; filename="catalog-export.json"',
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[admin/storefront/export-catalog] failed', error);
    return NextResponse.json({ error: 'Unable to export catalog' }, { status: 500 });
  }
}
