import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Admin page access is enforced client-side by AdminGuard and server-side on /api/admin/*. */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
