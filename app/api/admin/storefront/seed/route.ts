import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../lib/firebase/admin';
import { CMS_PATHS } from '../../../../../lib/firebase/storefrontCms.server';
import {
  DEFAULT_HOMEPAGE,
  DEFAULT_PROTOCOLS,
  DEFAULT_RESEARCH_ARTICLES,
  DEFAULT_SITE_SETTINGS,
  buildDefaultCategoryMerchandising,
} from '../../../../../lib/data/storefrontCmsDefaults';

export const dynamic = 'force-dynamic';

/** Seed Firestore CMS docs from code defaults (idempotent merge). */
export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const db = getAdminFirestore();
    const timestamp = FieldValue.serverTimestamp();
    const batch = db.batch();

    batch.set(db.doc(CMS_PATHS.settings), { ...DEFAULT_SITE_SETTINGS, updatedAt: timestamp }, { merge: true });
    batch.set(db.doc(CMS_PATHS.homepage), { ...DEFAULT_HOMEPAGE, updatedAt: timestamp }, { merge: true });
    batch.set(
      db.doc(CMS_PATHS.categories),
      { ...buildDefaultCategoryMerchandising(), updatedAt: timestamp },
      { merge: true }
    );

    for (const article of DEFAULT_RESEARCH_ARTICLES) {
      const { slug, ...data } = article;
      batch.set(
        db.collection(CMS_PATHS.research).doc(slug),
        { ...data, updatedAt: timestamp },
        { merge: true }
      );
    }

    for (const protocol of DEFAULT_PROTOCOLS) {
      const { id, ...data } = protocol;
      batch.set(
        db.collection(CMS_PATHS.protocols).doc(id),
        { ...data, updatedAt: timestamp },
        { merge: true }
      );
    }

    await batch.commit();

    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/research');
    revalidatePath('/protocols');

    await logAdminAction({
      userId: admin.uid,
      action: 'cms_seed_defaults',
      metadata: {
        research: DEFAULT_RESEARCH_ARTICLES.length,
        protocols: DEFAULT_PROTOCOLS.length,
      },
    });

    return NextResponse.json({ ok: true, message: 'CMS defaults seeded' });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[admin/storefront/seed] failed', error);
    return NextResponse.json({ error: 'Unable to seed CMS' }, { status: 500 });
  }
}
