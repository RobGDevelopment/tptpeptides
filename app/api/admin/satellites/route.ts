import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import { satelliteProvisionRequestSchema } from '../../../../lib/schemas/opsException';
import {
  getSatelliteDomainStatus,
  listSatelliteTenants,
  provisionSatelliteTenant,
} from '../../../../lib/tenant/provisionSatellite.server';
import { isVercelDomainsConfigured } from '../../../../lib/vercel/domains.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    if (!isModuleEnabled(flags, 'isSatelliteProvisioningEnabled')) {
      return NextResponse.json({ error: 'Satellite provisioning is not enabled.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    if (domain) {
      const status = await getSatelliteDomainStatus(domain);
      return NextResponse.json({ domain, status });
    }

    const satellites = await listSatelliteTenants();
    return NextResponse.json({
      configured: isVercelDomainsConfigured(),
      satellites,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unable to fetch satellite status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const flags = await getModuleFlags();
    if (!isModuleEnabled(flags, 'isSatelliteProvisioningEnabled')) {
      return NextResponse.json({ error: 'Satellite provisioning is not enabled.' }, { status: 404 });
    }

    const body = satelliteProvisionRequestSchema.parse(await request.json());
    const result = await provisionSatelliteTenant(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to provision satellite' }, { status: 500 });
  }
}
