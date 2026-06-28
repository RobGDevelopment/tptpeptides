import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getSalesSettings, writeSalesSettings } from '../../../../../lib/firebase/sales.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { salesSettingsPatchSchema } from '../../../../../lib/schemas/sales';
import { ModuleDisabledError, requireModule } from '../../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

function assertSalesSettingsAccess(flags: Awaited<ReturnType<typeof getModuleFlags>>): void {
  if (
    !flags.isSalesCommandCenterEnabled &&
    !flags.isLeadRoutingEnabled
  ) {
    throw new ModuleDisabledError('isSalesCommandCenterEnabled');
  }
}

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    assertSalesSettingsAccess(flags);

    const settings = await getSalesSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Sales settings are unavailable' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to load sales settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    assertSalesSettingsAccess(flags);

    const body = salesSettingsPatchSchema.parse(await request.json());
    const settings = await writeSalesSettings(body, admin.uid);
    revalidateTag('sales-settings', 'max');

    await logAdminAction({
      userId: admin.uid,
      action: 'sales_settings_update',
      metadata: { aeCount: settings.aeRoster.length },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Sales settings are unavailable' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid sales settings' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to save sales settings' }, { status: 500 });
  }
}
