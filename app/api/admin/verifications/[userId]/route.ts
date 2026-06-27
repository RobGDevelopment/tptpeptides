import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AdminAuthError,
  logAdminAction,
  requireAdminSession,
} from '../../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import {
  approveVerification,
  rejectVerification,
} from '../../../../../lib/firebase/verification.server';
import { ModuleDisabledError, requireModule } from '../../../../../lib/modules/requireModule.server';

export const dynamic = 'force-dynamic';

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), institutionTier: z.enum(['Bronze', 'Silver', 'Gold']).optional() }),
  z.object({ action: z.literal('reject'), rejectionReason: z.string().max(500).optional() }),
]);

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdminSession(request);
    const flags = await getModuleFlags();
    requireModule(flags, 'isInstitutionVerificationEnabled');

    const { userId } = await params;
    const body = patchSchema.parse(await request.json());

    if (body.action === 'approve') {
      await approveVerification({
        userId,
        reviewedBy: admin.uid,
        institutionTier: body.institutionTier,
      });

      await logAdminAction({
        userId: admin.uid,
        action: 'verification_approved',
        metadata: { targetUserId: userId, institutionTier: body.institutionTier ?? 'Bronze' },
      });
    } else {
      await rejectVerification({
        userId,
        reviewedBy: admin.uid,
        rejectionReason: body.rejectionReason,
      });

      await logAdminAction({
        userId: admin.uid,
        action: 'verification_rejected',
        metadata: { targetUserId: userId, reason: body.rejectionReason ?? null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ModuleDisabledError) {
      return NextResponse.json({ error: 'Institution verification module is disabled' }, { status: 404 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid review action' }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update verification' }, { status: 500 });
  }
}
