import 'server-only';

import type { InvitePreviewInput } from '../schemas/invitation';
import { USER_ROLE_LABELS } from '../schemas/user';
import { getInviteUrls } from './inviteUrls.server';
import { buildPersonaInviteEmail } from './templates/personaInviteEmails';

const PREVIEW_EMAIL = 'researcher@example.com';

export function buildInviteEmailPreview(input: InvitePreviewInput): {
  subject: string;
  html: string;
  text: string;
} {
  const email = input.email?.trim() || PREVIEW_EMAIL;
  const urls = getInviteUrls(input.siteUrl);
  const roleLabel =
    input.role != null ? USER_ROLE_LABELS[input.role] : USER_ROLE_LABELS.ops;

  return buildPersonaInviteEmail({
    email,
    persona: input.persona,
    passwordResetUrl: urls.previewPasswordResetUrl,
    ...urls,
    institutionTier: input.institutionTier,
    institutionName: input.institutionName,
    personalNote: input.personalNote,
    roleLabel: input.persona === 'staff_partner' ? roleLabel : undefined,
  });
}
