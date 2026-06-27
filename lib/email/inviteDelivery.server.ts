import 'server-only';

import type { AdminUserInviteInput, InviteStatus } from '../schemas/invitation';
import type { InstitutionTier } from '../schemas/user';
import { USER_ROLE_LABELS } from '../schemas/user';
import { sendFirebasePasswordResetEmail } from './firebasePasswordResetEmail.server';
import { buildPersonaInviteEmail } from './templates/personaInviteEmails';
import { isResendConfigured, isResendSandboxMode, sendEmail } from './resend.server';

export type InviteEmailDeliveryMethod = 'resend' | 'firebase';

export interface InviteEmailDeliveryResult {
  inviteStatus: InviteStatus;
  emailSent: boolean;
  deliveryMethod?: InviteEmailDeliveryMethod;
  resendMessageId?: string;
  error?: string;
}

interface DeliverPersonaInviteEmailParams {
  email: string;
  persona: AdminUserInviteInput['persona'];
  passwordResetUrl: string;
  /** Where Firebase sends the user after they set a password (branded welcome page). */
  welcomeContinueUrl: string;
  siteBaseUrl: string;
  signInUrl: string;
  backOfficeUrl: string;
  catalogUrl: string;
  verifyUrl: string;
  modulesUrl: string;
  roleLabel?: string;
  institutionTier?: InstitutionTier;
  institutionName?: string;
  personalNote?: string;
}

/** Branded Resend first; in test mode (or when Resend fails) fall back to Firebase password email. */
export async function deliverPersonaInviteEmail(
  params: DeliverPersonaInviteEmailParams
): Promise<InviteEmailDeliveryResult> {
  const { subject, html, text } = buildPersonaInviteEmail({
    email: params.email,
    persona: params.persona,
    passwordResetUrl: params.passwordResetUrl,
    siteBaseUrl: params.siteBaseUrl,
    signInUrl: params.signInUrl,
    backOfficeUrl: params.backOfficeUrl,
    catalogUrl: params.catalogUrl,
    verifyUrl: params.verifyUrl,
    modulesUrl: params.modulesUrl,
    roleLabel: params.roleLabel,
    institutionTier: params.institutionTier,
    institutionName: params.institutionName,
    personalNote: params.personalNote,
  });

  if (isResendConfigured()) {
    try {
      const result = await sendEmail({ to: params.email, subject, html, text });
      if (result?.id) {
        return {
          inviteStatus: 'sent',
          emailSent: true,
          deliveryMethod: 'resend',
          resendMessageId: result.id,
        };
      }
    } catch (error) {
      if (!isResendSandboxMode()) {
        return {
          inviteStatus: 'failed',
          emailSent: false,
          error: error instanceof Error ? error.message : 'Email send failed',
        };
      }
      console.warn('[invite] Resend sandbox blocked — falling back to Firebase password email');
    }
  }

  try {
    await sendFirebasePasswordResetEmail(params.email, params.welcomeContinueUrl);
    return {
      inviteStatus: 'sent',
      emailSent: true,
      deliveryMethod: 'firebase',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Firebase email send failed';
    return {
      inviteStatus: 'failed',
      emailSent: false,
      error: isResendConfigured()
        ? `${message} (Resend test mode also blocked this partner address.)`
        : message,
    };
  }
}

export function roleLabelForInvite(
  persona: AdminUserInviteInput['persona'],
  role?: AdminUserInviteInput['role']
): string | undefined {
  if (persona === 'staff_partner' && role) {
    return USER_ROLE_LABELS[role];
  }
  return undefined;
}
