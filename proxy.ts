import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TENANT_ID_HEADER } from './lib/tenant/constants';
import { resolveTenantIdFromHost } from './lib/tenant/resolveTenant.edge';

/** Vercel Edge tenant routing — injects x-tenant-id from Host header. */
export function proxy(request: NextRequest) {
  const tenantId = resolveTenantIdFromHost(request.headers.get('host'));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_ID_HEADER, tenantId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(TENANT_ID_HEADER, tenantId);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
};
