import 'server-only';

import type { InvitePersona } from '../../schemas/invitation';
import type { InstitutionTier } from '../../schemas/user';
import { SITE_NAME } from '../../brand';
import { inviteLinkBlock, inviteStagingNotice, inviteStepsBlock, wrapInviteEmail } from './inviteShell';

export interface PersonaInviteEmailParams {
  email: string;
  persona: InvitePersona;
  passwordResetUrl: string;
  siteBaseUrl: string;
  signInUrl: string;
  backOfficeUrl: string;
  catalogUrl: string;
  verifyUrl: string;
  modulesUrl: string;
  institutionTier?: InstitutionTier;
  institutionName?: string;
  personalNote?: string;
  roleLabel?: string;
}

function noteBlock(note: string | undefined): string {
  if (!note?.trim()) return '';
  return `<p style="margin:20px 0 0;padding:16px;border-left:2px solid rgba(191,149,63,0.4);font-size:13px;color:#A3A3A3;font-style:italic;line-height:1.6;">${note.trim()}</p>`;
}

export function buildPersonaInviteEmail(
  params: PersonaInviteEmailParams
): { subject: string; html: string; text: string } {
  switch (params.persona) {
    case 'super_admin':
      return buildSuperAdminEmail(params);
    case 'staff_partner':
      return buildStaffPartnerEmail(params);
    case 'lab_buyer':
      return buildLabBuyerEmail(params);
    case 'first_purchase':
      return buildFirstPurchaseEmail(params);
  }
}

function buildSuperAdminEmail(params: PersonaInviteEmailParams) {
  const subject = `${SITE_NAME} — Back-Office access (Super Admin)`;
  const bodyHtml = `
    <p style="font-size:14px;line-height:1.7;color:#A3A3A3;font-weight:300;margin:0;">
      You have been invited as a <strong style="color:#BF953F;">Super Admin</strong> on the TPT Peptides platform.
      You can explore the full built site — storefront, client portal, and back-office — on our live preview environment.
    </p>
    ${inviteStagingNotice(params.siteBaseUrl)}
    ${inviteStepsBlock('How to get in (4 steps)', [
      `Click <strong style="color:#E8E8E8;">Set password &amp; sign in</strong> below and choose your password.`,
      `Sign in at <a href="${params.signInUrl}" style="color:#BF953F;text-decoration:none;">${params.signInUrl}</a> using <strong style="color:#E8E8E8;">${params.email}</strong>.`,
      `Open <strong style="color:#E8E8E8;">Back-Office</strong>: <a href="${params.backOfficeUrl}" style="color:#BF953F;text-decoration:none;">${params.backOfficeUrl}</a> — bookmark this link.`,
      `Enable features at <a href="${params.modulesUrl}" style="color:#BF953F;text-decoration:none;">Modules</a> (Users, Storefront, Orders, etc.) when you are ready to test.`,
    ])}
    ${noteBlock(params.personalNote)}`;

  const secondaryHtml = `
    ${inviteLinkBlock('Back-Office — bookmark this', params.backOfficeUrl)}
    ${inviteLinkBlock('Client sign-in', params.signInUrl)}
    ${inviteLinkBlock('Enable modules (after first login)', params.modulesUrl)}`;

  const html = wrapInviteEmail({
    headline: 'Back-Office Access',
    bodyHtml,
    ctaLabel: 'Set password & sign in',
    ctaUrl: params.passwordResetUrl,
    secondaryHtml,
    footerNote: 'Authorized personnel · Preview site on Vercel until production domain launch',
  });

  const text = [
    subject,
    '',
    `Live preview site: ${params.siteBaseUrl}`,
    '',
    'Steps:',
    '1. Set your password using the link below.',
    `2. Sign in: ${params.signInUrl} (${params.email})`,
    `3. Back-Office: ${params.backOfficeUrl}`,
    `4. Enable modules: ${params.modulesUrl}`,
    '',
    params.passwordResetUrl,
  ].join('\n');

  return { subject, html, text };
}

function buildStaffPartnerEmail(params: PersonaInviteEmailParams) {
  const role = params.roleLabel ?? 'Team member';
  const subject = `${SITE_NAME} — Team access (${role})`;

  const bodyHtml = `
    <p style="font-size:14px;line-height:1.7;color:#A3A3A3;font-weight:300;margin:0;">
      You have been invited as <strong style="color:#BF953F;">${role}</strong> on the TPT Peptides back-office platform.
    </p>
    ${inviteStagingNotice(params.siteBaseUrl)}
    ${inviteStepsBlock('How to get in', [
      `Set your password with the button below.`,
      `Sign in at <a href="${params.signInUrl}" style="color:#BF953F;text-decoration:none;">${params.signInUrl}</a>.`,
      `Open Back-Office: <a href="${params.backOfficeUrl}" style="color:#BF953F;text-decoration:none;">${params.backOfficeUrl}</a>.`,
    ])}
    ${noteBlock(params.personalNote)}`;

  const secondaryHtml = inviteLinkBlock('Back-Office', params.backOfficeUrl);

  const html = wrapInviteEmail({
    headline: 'Team Invitation',
    bodyHtml,
    ctaLabel: 'Set password & sign in',
    ctaUrl: params.passwordResetUrl,
    secondaryHtml,
  });

  const text = [subject, '', params.passwordResetUrl, params.backOfficeUrl].join('\n');
  return { subject, html, text };
}

function buildLabBuyerEmail(params: PersonaInviteEmailParams) {
  const tier = params.institutionTier ?? 'Bronze';
  const institution = params.institutionName?.trim();
  const subject = `${SITE_NAME} — Institutional research account (${tier})`;

  const bodyHtml = `
    <p style="font-size:14px;line-height:1.7;color:#A3A3A3;font-weight:300;margin:0;">
      ${institution ? `<strong style="color:#E8E8E8;">${institution}</strong> has been` : 'You have been'} pre-registered for
      <strong style="color:#BF953F;"> ${tier} institutional pricing</strong> on our research peptide catalog.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#737373;margin:20px 0 0;">
      After setting your password, complete institution verification to unlock B2B checkout and tiered pricing.
    </p>
    ${noteBlock(params.personalNote)}`;

  const secondaryHtml = `
    ${inviteLinkBlock('Verify institution (after sign-in)', params.verifyUrl)}
    ${inviteLinkBlock('Browse catalog', params.catalogUrl)}`;

  const html = wrapInviteEmail({
    headline: 'Institutional Access',
    bodyHtml,
    ctaLabel: 'Set password & get started',
    ctaUrl: params.passwordResetUrl,
    secondaryHtml,
  });

  const text = [
    subject,
    `Tier: ${tier}`,
    params.passwordResetUrl,
    params.verifyUrl,
    params.catalogUrl,
  ].join('\n');

  return { subject, html, text };
}

function buildFirstPurchaseEmail(params: PersonaInviteEmailParams) {
  const subject = `${SITE_NAME} — Welcome to the research terminal`;

  const bodyHtml = `
    <p style="font-size:14px;line-height:1.7;color:#A3A3A3;font-weight:300;margin:0;">
      Your client portal account is ready. Browse our ISO-aligned research inventory, manage orders, and access COA documentation — strictly for <strong style="color:#A3A3A3;">in vitro research</strong>.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#737373;margin:20px 0 0;">
      Set your password below, then explore the catalog. Age verification is required on first visit.
    </p>
    ${noteBlock(params.personalNote)}`;

  const secondaryHtml = inviteLinkBlock('Research catalog', params.catalogUrl);

  const html = wrapInviteEmail({
    headline: 'Welcome',
    bodyHtml,
    ctaLabel: 'Set password & browse',
    ctaUrl: params.passwordResetUrl,
    secondaryHtml,
  });

  const text = [subject, '', params.passwordResetUrl, params.catalogUrl].join('\n');
  return { subject, html, text };
}
