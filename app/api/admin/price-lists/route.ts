import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AdminAuthError,
  logAdminAction,
  requireAdminSession,
} from '../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { listPriceLists, writePriceList } from '../../../../lib/firebase/pricing.server';
import { ModuleDisabledError, requireB2BProcurement } from '../../../../lib/modules/b2b.server';
import { priceListPatchSchema } from '../../../../lib/schemas/priceList';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireB2BProcurement(flags, 'isTieredPricingEnabled');

    const priceLists = await listPriceLists();
    return NextResponse.json({ priceLists });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Tiered pricing module is disabled' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to load price lists' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireB2BProcurement(flags, 'isTieredPricingEnabled');

    const body = priceListPatchSchema.parse(await request.json());
    const priceList = await writePriceList(body, admin.uid);

    revalidateTag(`price-list-${body.tier}`, 'max');

    await logAdminAction({
      userId: admin.uid,
      action: 'price_list_update',
      metadata: { tier: body.tier },
    });

    return NextResponse.json({ priceList });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Tiered pricing module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid price list payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update price list' }, { status: 500 });
  }
}
