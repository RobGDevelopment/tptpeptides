import 'server-only';

export const IMPERSONATION_COOKIE = 'tpt-impersonate';

export interface ImpersonationContext {
  aeUid: string;
  targetUid: string;
  targetEmail: string;
  startedAt: string;
}

function parseCookieHeader(cookieHeader: string | null): ImpersonationContext | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${IMPERSONATION_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;

  try {
    const decoded = decodeURIComponent(match[1]);
    const parsed = JSON.parse(decoded) as ImpersonationContext;
    if (!parsed.aeUid || !parsed.targetUid) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readImpersonationFromRequest(request: Request): ImpersonationContext | null {
  return parseCookieHeader(request.headers.get('cookie'));
}

export function serializeImpersonationCookie(context: ImpersonationContext): string {
  return encodeURIComponent(JSON.stringify(context));
}

export async function getEffectivePricingUserId(
  request: Request,
  sessionUid: string | null
): Promise<string | null> {
  const impersonation = readImpersonationFromRequest(request);
  if (impersonation?.targetUid) {
    return impersonation.targetUid;
  }
  return sessionUid;
}

export function clearImpersonationCookie(): {
  name: string;
  value: string;
  options: { httpOnly: boolean; secure: boolean; sameSite: 'lax'; path: string; maxAge: number };
} {
  return {
    name: IMPERSONATION_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    },
  };
}

export function setImpersonationCookie(context: ImpersonationContext): {
  name: string;
  value: string;
  options: { httpOnly: boolean; secure: boolean; sameSite: 'lax'; path: string; maxAge: number };
} {
  return {
    name: IMPERSONATION_COOKIE,
    value: serializeImpersonationCookie(context),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 4,
    },
  };
}

export function impersonationMatchesSession(
  impersonation: ImpersonationContext | null,
  sessionUid: string | null
): ImpersonationContext | null {
  if (!impersonation || !sessionUid || impersonation.aeUid !== sessionUid) {
    return null;
  }
  return impersonation;
}
