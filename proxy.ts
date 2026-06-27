import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_SESSION_COOKIE = 'tpt-auth';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = request.cookies.get(AUTH_SESSION_COOKIE);
    if (!session?.value) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('redirect', 'admin');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
