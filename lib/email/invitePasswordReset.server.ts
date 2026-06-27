import 'server-only';

import { getAdminAuth } from '../firebase/admin';
import { getInviteSiteUrl } from '../site';

/** Password reset link that returns partners to the live site after they set a password. */
export async function generateInvitePasswordResetLink(
  email: string,
  siteUrl?: string,
  continuePath?: string
): Promise<string> {
  const auth = getAdminAuth();
  const base = getInviteSiteUrl(siteUrl);
  const continueUrl = continuePath
    ? `${base}${continuePath.startsWith('/') ? continuePath : `/${continuePath}`}`
    : `${base}/account`;

  try {
    return await auth.generatePasswordResetLink(email, { url: continueUrl });
  } catch (error) {
    console.warn(
      '[invite] Reset link with continue URL failed — ensure Firebase Authorized domains includes',
      new URL(base).host,
      error
    );
    return auth.generatePasswordResetLink(email);
  }
}
