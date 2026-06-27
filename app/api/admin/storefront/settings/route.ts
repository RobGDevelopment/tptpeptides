import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { findComplianceViolations } from '../../../../../lib/compliance/copyGuard';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getAdminFirestore, isAdminSdkConfigured } from '../../../../../lib/firebase/admin';
import { CMS_PATHS } from '../../../../../lib/firebase/storefrontCms.server';
import {
  categoryMerchandisingSchema,
  homepageMerchandisingSchema,
  siteSettingsSchema,
} from '../../../../../lib/schemas/storefrontCms';

export const dynamic = 'force-dynamic';

function revalidateStorefront() {
  revalidatePath('/');
  revalidatePath('/catalog');
  revalidatePath('/research');
  revalidatePath('/protocols');
  revalidateTag('cms-settings', 'max');
  revalidateTag('cms-homepage', 'max');
}

function complianceErrorResponse(field: string, text: string) {
  const violations = findComplianceViolations(text);
  if (violations.length === 0) return null;
  return NextResponse.json(
    { error: `Non-compliant copy in ${field}: ${violations.join(', ')}` },
    { status: 400 }
  );
}

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const db = getAdminFirestore();
    const [settingsSnap, homepageSnap, categoriesSnap] = await Promise.all([
      db.doc(CMS_PATHS.settings).get(),
      db.doc(CMS_PATHS.homepage).get(),
      db.doc(CMS_PATHS.categories).get(),
    ]);

    return NextResponse.json({
      settings: settingsSnap.exists ? settingsSnap.data() : null,
      homepage: homepageSnap.exists ? homepageSnap.data() : null,
      categories: categoriesSnap.exists ? categoriesSnap.data() : null,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to load storefront settings' }, { status: 500 });
  }
}

const putBodySchema = z.object({
  settings: siteSettingsSchema,
  homepage: homepageMerchandisingSchema,
});

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const payload = putBodySchema.parse(await request.json());

    for (const [field, text] of [
      ['hero body', payload.settings.heroBody],
      ['featured subtitle', payload.homepage.featuredSubtitle],
    ] as const) {
      const blocked = complianceErrorResponse(field, text);
      if (blocked) return blocked;
    }

    const db = getAdminFirestore();
    const timestamp = FieldValue.serverTimestamp();

    await db.doc(CMS_PATHS.settings).set({ ...payload.settings, updatedAt: timestamp }, { merge: true });
    await db.doc(CMS_PATHS.homepage).set({ ...payload.homepage, updatedAt: timestamp }, { merge: true });

    await logAdminAction({
      userId: admin.uid,
      action: 'cms_storefront_save',
      metadata: { featuredCount: payload.homepage.featuredSlugs.length },
    });

    revalidateStorefront();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid data' }, { status: 400 });
    }
    console.error('[admin/storefront/settings] PUT failed', error);
    return NextResponse.json({ error: 'Unable to save storefront settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const payload = categoryMerchandisingSchema.parse(await request.json());
    const db = getAdminFirestore();
    await db.doc(CMS_PATHS.categories).set(
      { ...payload, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    await logAdminAction({
      userId: admin.uid,
      action: 'cms_categories_save',
      metadata: { count: payload.categories.length },
    });

    revalidatePath('/catalog');
    revalidateTag('cms-categories', 'max');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid data' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to save categories' }, { status: 500 });
  }
}
