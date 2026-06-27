import { NextResponse } from 'next/server';

export const AUTH_SESSION_COOKIE = 'tpt-auth';

export async function POST(request: Request) {
  const body = (await request.json()) as { idToken?: string };
  if (!body.idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_SESSION_COOKIE, body.idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
