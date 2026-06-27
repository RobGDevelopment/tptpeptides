import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { findComplianceViolations } from '../../../../../lib/compliance/copyGuard';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../lib/firebase/admin';
import { CMS_PATHS } from '../../../../../lib/firebase/storefrontCms.server';
import { researchArticleCmsSchema } from '../../../../../lib/schemas/storefrontCms';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const snapshot = await getAdminFirestore().collection(CMS_PATHS.research).get();
    const articles = snapshot.docs.map((doc) => ({ slug: doc.id, ...doc.data() }));
    return NextResponse.json({ articles });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to load research articles' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const article = researchArticleCmsSchema.parse(await request.json());
    const violations = [
      ...findComplianceViolations(article.excerpt),
      ...article.body.flatMap((paragraph) => findComplianceViolations(paragraph)),
    ];
    if (violations.length > 0) {
      return NextResponse.json(
        { error: `Non-compliant copy: ${[...new Set(violations)].join(', ')}` },
        { status: 400 }
      );
    }

    const { slug, ...data } = article;
    await getAdminFirestore()
      .collection(CMS_PATHS.research)
      .doc(slug)
      .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    await logAdminAction({
      userId: admin.uid,
      action: 'cms_research_save',
      metadata: { slug },
    });

    revalidatePath('/research');
    revalidatePath(`/research/${slug}`);
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid article' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to save article' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    await getAdminFirestore().collection(CMS_PATHS.research).doc(slug).delete();
    await logAdminAction({ userId: admin.uid, action: 'cms_research_delete', metadata: { slug } });
    revalidatePath('/research');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to delete article' }, { status: 500 });
  }
}
