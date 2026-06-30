import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { uploadClinicMarketingImage } from '../../../../../lib/firebase/clinicAssets.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);

    const flags = await getModuleFlags();
    if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
      return NextResponse.json({ error: 'Wellness module is not enabled.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { publicUrl } = await uploadClinicMarketingImage({
      fileName: file.name,
      mimeType: file.type,
      buffer,
    });

    return NextResponse.json({ ok: true, publicUrl });
  } catch (caught) {
    if (caught instanceof AdminAuthError) {
      return NextResponse.json({ error: caught.message }, { status: caught.statusCode ?? 401 });
    }
    const message = caught instanceof Error ? caught.message : 'Unable to upload image.';
    console.error('[admin/wellness/clinic-assets] failed', caught);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
