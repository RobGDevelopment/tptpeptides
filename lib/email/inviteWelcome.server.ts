import 'server-only';

import { INVITE_PERSONA_LABELS, type InvitePersona } from '../schemas/invitation';
import type { InstitutionTier } from '../schemas/user';
import { getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';
import { getInviteUrls } from './inviteUrls.server';

export interface InviteWelcomeViewModel {
  inviteId: string;
  email: string;
  persona: InvitePersona;
  personaLabel: string;
  personaDescription: string;
  personalNote?: string;
  institutionName?: string;
  institutionTier?: InstitutionTier;
  siteBaseUrl: string;
  signInUrl: string;
  backOfficeUrl: string;
  catalogUrl: string;
  verifyUrl: string;
  modulesUrl: string;
  isAdminPersona: boolean;
}

export async function getInviteWelcomeViewModel(
  inviteId: string
): Promise<InviteWelcomeViewModel | null> {
  if (!isAdminSdkConfigured()) return null;

  const doc = await getAdminFirestore().collection('invitations').doc(inviteId).get();
  if (!doc.exists) return null;

  const data = doc.data() ?? {};
  const persona = data.persona as InvitePersona | undefined;
  const email = String(data.email ?? '').trim().toLowerCase();

  if (!persona || !email) return null;

  const urls = getInviteUrls();
  const meta = INVITE_PERSONA_LABELS[persona];

  return {
    inviteId,
    email,
    persona,
    personaLabel: meta.label,
    personaDescription: meta.description,
    personalNote: data.personalNote as string | undefined,
    institutionName: data.institutionName as string | undefined,
    institutionTier: data.institutionTier as InstitutionTier | undefined,
    isAdminPersona: persona === 'super_admin' || persona === 'staff_partner',
    ...urls,
  };
}
