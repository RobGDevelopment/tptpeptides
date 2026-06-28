import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { AdminAuthError, logAdminAction, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getComplianceSettings, writeComplianceSettings } from '../../../../lib/firebase/compliance.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { complianceSettingsPatchSchema } from '../../../../lib/schemas/compliance';
import { ModuleDisabledError, requireModule } from '../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isComplianceGeoBlockEnabled');

    const settings = await getComplianceSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Geo compliance module is disabled' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to load compliance settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isComplianceGeoBlockEnabled');

    const body = complianceSettingsPatchSchema.parse(await request.json());
    const settings = await writeComplianceSettings(body, admin.uid);
    revalidateTag('compliance-settings', 'max');

    await logAdminAction({
      userId: admin.uid,
      action: 'compliance_settings_update',
      metadata: { restrictedStates: settings.restrictedStates },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Geo compliance module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid compliance settings' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to save compliance settings' }, { status: 500 });
  }
}
