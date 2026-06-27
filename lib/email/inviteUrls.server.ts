import 'server-only';

import { getInviteSiteUrl } from '../site';

export function getInviteUrls(siteUrl?: string) {
  const base = getInviteSiteUrl(siteUrl);
  return {
    siteBaseUrl: base,
    signInUrl: `${base}/account`,
    backOfficeUrl: `${base}/admin`,
    catalogUrl: `${base}/catalog`,
    verifyUrl: `${base}/account/verify`,
    modulesUrl: `${base}/admin/modules`,
    /** Branded onboarding after password set */
    inviteWelcomeUrl: (inviteId: string) => `${base}/invite/${inviteId}`,
    /** Placeholder — real invites use Firebase-generated reset links */
    previewPasswordResetUrl: `${base}/account?invite=set-password`,
  };
}
