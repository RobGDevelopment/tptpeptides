import { NextResponse } from 'next/server';
import { getSiteUrl } from '../../../../../../lib/site';
import { completeIntegrationOAuthCallback } from '../../../../../../lib/integrations/oauth/handlers.server';
import {
  assertOAuthIntegrationSlug,
  OAUTH_STATE_COOKIE,
} from '../../../../../../lib/integrations/oauth/constants.server';
import {
  oauthStateCookieOptions,
  validateOAuthCallbackState,
} from '../../../../../../lib/integrations/oauth/state.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function buildRedirectUrl(returnTo: string, params: Record<string, string>): string {
  const base = getSiteUrl().replace(/\/$/, '');
  const url = new URL(`${base}${returnTo}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await context.params;

  let slug;
  try {
    slug = assertOAuthIntegrationSlug(rawSlug);
  } catch {
    return NextResponse.redirect(
      buildRedirectUrl('/admin/settings/integrations', {
        oauth: 'error',
        message: 'unsupported_integration',
      })
    );
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get('error');
  const stateFromQuery = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const cookieValue = request.headers.get('cookie')?.match(
    new RegExp(`(?:^|; )${OAUTH_STATE_COOKIE}=([^;]*)`)
  )?.[1];

  const decodedCookie = cookieValue ? decodeURIComponent(cookieValue) : null;
  const statePayload = validateOAuthCallbackState(stateFromQuery, decodedCookie);
  const returnTo = statePayload?.returnTo ?? '/admin/settings/integrations';

  const clearCookie = (response: NextResponse) => {
    response.cookies.set(OAUTH_STATE_COOKIE, '', { ...oauthStateCookieOptions(0), maxAge: 0 });
    return response;
  };

  if (oauthError) {
    return clearCookie(
      NextResponse.redirect(
        buildRedirectUrl(returnTo, {
          oauth: 'error',
          slug,
          message: oauthError,
        })
      )
    );
  }

  if (!statePayload || !code?.trim()) {
    return clearCookie(
      NextResponse.redirect(
        buildRedirectUrl(returnTo, {
          oauth: 'error',
          slug,
          message: 'invalid_oauth_state',
        })
      )
    );
  }

  if (statePayload.slug !== slug) {
    return clearCookie(
      NextResponse.redirect(
        buildRedirectUrl(returnTo, {
          oauth: 'error',
          slug,
          message: 'slug_mismatch',
        })
      )
    );
  }

  try {
    await completeIntegrationOAuthCallback({
      slug,
      mode: statePayload.mode,
      actorAdminUid: statePayload.actorAdminUid,
      code: code.trim(),
      realmId: url.searchParams.get('realmId'),
    });

    return clearCookie(
      NextResponse.redirect(
        buildRedirectUrl(returnTo, {
          oauth: 'success',
          slug,
        })
      )
    );
  } catch (error) {
    console.error('[integrations/oauth/callback] failed', error);
    const message = error instanceof Error ? error.message : 'oauth_callback_failed';

    return clearCookie(
      NextResponse.redirect(
        buildRedirectUrl(returnTo, {
          oauth: 'error',
          slug,
          message,
        })
      )
    );
  }
}
