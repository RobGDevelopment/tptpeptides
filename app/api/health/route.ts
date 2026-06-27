import { NextResponse } from 'next/server';
import { isAdminSdkConfigured } from '../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  let adminSdkReady = false;
  let adminSdkError: string | undefined;

  if (isAdminSdkConfigured()) {
    try {
      const { getAdminAuth } = await import('../../../lib/firebase/admin');
      await getAdminAuth().listUsers(1);
      adminSdkReady = true;
    } catch (error) {
      adminSdkError = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json({
    ok: adminSdkReady,
    adminSdkConfigured: isAdminSdkConfigured(),
    adminSdkReady,
    adminSdkError,
    timestamp: new Date().toISOString(),
  });
}
