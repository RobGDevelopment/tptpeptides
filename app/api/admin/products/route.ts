import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { productDocSchema } from '../../../../lib/schemas/product';
import { assertRuOProductDescription, findComplianceViolations } from '../../../../lib/compliance/copyGuard';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';import { getAdminFirestore, isAdminSdkConfigured } from '../../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

const variantSchema = z.object({
  id: z.string().min(1),
  tag: z.string().min(1),
  price: z.number().positive(),
  baseCost: z.number().nullable().optional(),
  stock: z.number().int().min(0),
  active: z.boolean(),
  reorderThreshold: z.number().int().min(0).default(20),
  storefrontBadge: z.enum(['none', 'new_batch']).default('none'),
  activeFrom: z.string().datetime().nullable().optional(),
  activeUntil: z.string().datetime().nullable().optional(),
});

const bodySchema = z.object({
  catalogId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  desc: z.string().min(1),
  researchAreas: z.array(z.string()).default([]),
  variants: z.array(variantSchema).min(1),
});

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession(request);

    if (!isAdminSdkConfigured()) {
      return NextResponse.json({ error: 'Firebase Admin SDK not configured' }, { status: 503 });
    }

    const payload = bodySchema.parse(await request.json());

    const nameViolations = findComplianceViolations(payload.name);
    const descResult = assertRuOProductDescription(payload.desc);
    const descViolations = descResult.violations;
    const areaViolations = payload.researchAreas.flatMap((area) => findComplianceViolations(area));
    const allViolations = [...new Set([...nameViolations, ...descViolations, ...areaViolations])];
    if (allViolations.length > 0) {
      return NextResponse.json(
        { error: `Non-compliant product copy: ${allViolations.join(', ')}` },
        { status: 400 }
      );
    }

    const sanitizedDesc = descResult.sanitized;
    const db = getAdminFirestore();
    const batch = db.batch();

    for (const variant of payload.variants) {
      const doc = productDocSchema.parse({
        name: payload.name,
        tag: variant.tag,
        price: variant.price,
        baseCost: variant.baseCost ?? null,
        stock: variant.stock,
        desc: sanitizedDesc,
        purity: 'Research Grade',
        category: payload.category,
        catalogId: payload.catalogId,
        variantId: variant.id,
        researchAreas: payload.researchAreas,
        active: variant.active,
        reorderThreshold: variant.reorderThreshold,
        storefrontBadge: variant.storefrontBadge,
        activeFrom: variant.activeFrom ?? null,
        activeUntil: variant.activeUntil ?? null,
        supplierId: 'default-supplier',
      });

      const ref = db.collection('products').doc(variant.id);
      batch.set(
        ref,
        {
          ...doc,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    await logAdminAction({
      userId: admin.uid,
      action: 'product_save',
      metadata: { catalogId: payload.catalogId, variantCount: payload.variants.length },
    });

    return NextResponse.json({ ok: true, catalogId: payload.catalogId });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid product data' }, { status: 400 });
    }
    console.error('[admin/products] PUT failed', error);
    return NextResponse.json({ error: 'Unable to save product' }, { status: 500 });
  }
}
