import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '../../../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../../../lib/firebase/modules.server';
import {
  assertOAuthIntegrationSlug,
  OAUTH_STATE_COOKIE,
} from '../../../../../../lib/integrations/oauth/constants.server';
import { buildIntegrationAuthorizeUrl } from '../../../../../../lib/integrations/oauth/handlers.server';
import {
  createOAuthState,
  oauthStateCookieOptions,
} from '../../../../../../lib/integrations/oauth/state.server';
import { isModuleEnabled } from '../../../../../../lib/modules/flags';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseOAuthMode(value: string | null): 'sandbox' | 'live' {
  return value?.trim().toLowerCase() === 'sandbox' ? 'sandbox' : 'live';
}

function sanitizeReturnTo(value: string | null): string {
  const fallback = '/admin/settings/integrations';
  if (!value?.trim()) return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith('/admin/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;

  return trimmed;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await requireAdminSession(request);
    const flags = await getModuleFlags();

    if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
      return NextResponse.json({ error: 'Wellness module is not enabled.' }, { status: 403 });
    }

    const { slug: rawSlug } = await context.params;
    const slug = assertOAuthIntegrationSlug(rawSlug);

    const url = new URL(request.url);
    const mode = parseOAuthMode(url.searchParams.get('mode'));
    const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'));

    const { state, cookieValue } = createOAuthState({
      slug,
      mode,
      returnTo,
      actorAdminUid: session.uid,
    });

    const authorizeUrl = buildIntegrationAuthorizeUrl({ slug, state, mode });
    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(OAUTH_STATE_COOKIE, cookieValue, oauthStateCookieOptions());

    return response;
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('[integrations/oauth/start] failed', error);
    const message = error instanceof Error ? error.message : 'OAuth start failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
