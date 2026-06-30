import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TENANT_ID_HEADER } from './lib/tenant/constants';
import { getB2bAdminBaseUrl } from './lib/tenant/liveSites.edge';
import { resolveTenantFromHost, type TenantResolution } from './lib/tenant/resolveTenant.edge';
import { updateSession } from './lib/supabase/middleware';

const BYPASS_PREFIXES = ['/api', '/admin', '/_next', '/static', '/corp'];
const BYPASS_FILES = new Set([
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
  '/apple-icon',
  '/icon',
  '/manifest.webmanifest',
]);

function shouldBypassRewrite(pathname: string): boolean {
  if (BYPASS_FILES.has(pathname)) return true;
  return BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function finalizeResponse(
  request: NextRequest,
  response: NextResponse,
  resolution: TenantResolution
): Promise<NextResponse> {
  if (resolution.lane === 'telehealth') {
    return updateSession(request, response);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const resolution = resolveTenantFromHost(request.headers.get('host'));
  const { pathname } = request.nextUrl;

  // 1. Core Structural Bypass
  if (shouldBypassRewrite(pathname)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(TENANT_ID_HEADER, resolution.tenantId);
    requestHeaders.set('x-tenant-lane', resolution.lane);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set(TENANT_ID_HEADER, resolution.tenantId);
    return finalizeResponse(request, response, resolution);
  }

  // 2. Clear Clinic Lane Boundaries — admin lives on the B2B host
  if (resolution.lane === 'telehealth' && pathname.startsWith('/admin')) {
    const adminUrl = new URL('/admin', getB2bAdminBaseUrl());
    const response = NextResponse.redirect(adminUrl);
    return finalizeResponse(request, response, resolution);
  }

  // 3. Loop Interception
  if (pathname.startsWith(resolution.internalPrefix)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(TENANT_ID_HEADER, resolution.tenantId);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set(TENANT_ID_HEADER, resolution.tenantId);
    return finalizeResponse(request, response, resolution);
  }

  // 4. Clean Edge Path Mutation
  const url = request.nextUrl.clone();
  url.pathname = `${resolution.internalPrefix}${pathname === '/' ? '' : pathname}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_ID_HEADER, resolution.tenantId);
  requestHeaders.set('x-tenant-lane', resolution.lane);

  const response = NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });

  response.headers.set(TENANT_ID_HEADER, resolution.tenantId);
  response.headers.set('x-tenant-lane', resolution.lane);

  return finalizeResponse(request, response, resolution);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|mp4|webm|mov)$).*)',
  ],
};
