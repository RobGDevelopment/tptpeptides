import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getCatalogSeedProducts } from '../../../../lib/data/seedCatalog';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession(request);

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const products = getCatalogSeedProducts();
    const db = getAdminFirestore();
    const batchSize = 400;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = db.batch();
      const chunk = products.slice(i, i + batchSize);

      for (const product of chunk) {
        const ref = db.collection('products').doc(product.id);
        batch.set(
          ref,
          {
            ...product.data,
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await batch.commit();
    }

    await logAdminAction({
      userId: admin.uid,
      action: 'catalog_seed',
      metadata: { productCount: products.length, source: 'lib/data/catalog.json' },
    });

    return NextResponse.json({
      ok: true,
      productCount: products.length,
      message: `Seeded ${products.length} product variants from catalog.json`,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[admin/seed] failed', error);
    return NextResponse.json({ error: 'Seed operation failed' }, { status: 500 });
  }
}
