import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { writeOperationsSettings } from '../../../../lib/firebase/operations.server';
import { operationsSettingsPatchSchema } from '../../../../lib/schemas/operations';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminSession(request);
    const body = operationsSettingsPatchSchema.parse(await request.json());
    const settings = await writeOperationsSettings(body, admin.uid);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update operations settings' }, { status: 500 });
  }
}
