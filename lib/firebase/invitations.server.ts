import 'server-only';

import type { InvitePersona } from '../schemas/invitation';
import type { InstitutionTier, UserRole } from '../schemas/user';
import { normalizeUserRole } from '../schemas/user';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';

export interface StoredInvitation {
  id: string;
  email: string;
  persona: InvitePersona;
  status: string;
  targetUid: string;
  invitedBy: string;
  invitedAt: string;
  personalNote?: string;
  institutionTier?: InstitutionTier;
  institutionName?: string;
  error?: string;
}

export interface InviteDraft {
  email: string;
  persona: InvitePersona;
  role?: 'admin' | 'partner' | 'staff';
  institutionTier?: InstitutionTier;
  institutionName?: string;
  personalNote?: string;
}

function inferPersona(
  role: UserRole,
  userData: Record<string, unknown>
): InvitePersona {
  const stored = userData.invitePersona as InvitePersona | undefined;
  if (stored) return stored;
  if (role === 'admin') return 'super_admin';
  if (role === 'partner' || role === 'staff') return 'staff_partner';
  if (userData.institutionTier) return 'lab_buyer';
  return 'first_purchase';
}

function draftFromUser(uid: string, data: Record<string, unknown>): InviteDraft {
  const role = normalizeUserRole(data.role as string | undefined);
  const email = String(data.email ?? '').trim().toLowerCase();
  const persona = inferPersona(role, data);

  const draft: InviteDraft = {
    email,
    persona,
    personalNote: (data.invitePersonalNote as string | undefined) ?? undefined,
  };

  if (persona === 'staff_partner') {
    draft.role = role === 'admin' || role === 'partner' || role === 'staff' ? role : 'staff';
  }

  if (persona === 'lab_buyer') {
    draft.institutionTier = (data.institutionTier as InstitutionTier | undefined) ?? 'Bronze';
    draft.institutionName = (data.institutionName as string | undefined) ?? undefined;
  }

  return draft;
}

function mapInvitationDoc(id: string, data: Record<string, unknown>): StoredInvitation {
  return {
    id,
    email: String(data.email ?? ''),
    persona: data.persona as InvitePersona,
    status: String(data.status ?? 'pending'),
    targetUid: String(data.targetUid ?? ''),
    invitedBy: String(data.invitedBy ?? ''),
    invitedAt: String(data.invitedAt ?? ''),
    personalNote: data.personalNote as string | undefined,
    institutionTier: data.institutionTier as InstitutionTier | undefined,
    institutionName: data.institutionName as string | undefined,
    error: data.error as string | undefined,
  };
}

export async function getLatestInvitationForUser(
  targetUid: string
): Promise<StoredInvitation | null> {
  if (!isAdminSdkConfigured()) return null;

  const snapshot = await getAdminFirestore()
    .collection('invitations')
    .where('targetUid', '==', targetUid)
    .limit(25)
    .get();

  if (snapshot.empty) return null;

  const latest = snapshot.docs.sort((a, b) => {
    const aTime = String(a.data().invitedAt ?? '');
    const bTime = String(b.data().invitedAt ?? '');
    return bTime.localeCompare(aTime);
  })[0];

  return mapInvitationDoc(latest.id, latest.data());
}

export async function getInviteContextForUser(targetUid: string): Promise<{
  targetUid: string;
  draft: InviteDraft;
  lastInvitation: StoredInvitation | null;
} | null> {
  if (!isAdminSdkConfigured()) return null;

  const userDoc = await getAdminFirestore().collection('users').doc(targetUid).get();
  if (!userDoc.exists) return null;

  const userData = userDoc.data() ?? {};
  const draft = draftFromUser(targetUid, userData);
  const lastInvitation = await getLatestInvitationForUser(targetUid);

  if (lastInvitation) {
    draft.persona = lastInvitation.persona;
    draft.personalNote = lastInvitation.personalNote ?? draft.personalNote;
    if (lastInvitation.institutionTier) draft.institutionTier = lastInvitation.institutionTier;
    if (lastInvitation.institutionName) draft.institutionName = lastInvitation.institutionName;
    if (lastInvitation.persona === 'staff_partner') {
      const role = normalizeUserRole(userData.role as string | undefined);
      if (role === 'admin' || role === 'partner' || role === 'staff') {
        draft.role = role;
      }
    }
  }

  return { targetUid, draft, lastInvitation };
}

export async function getInviteContextByEmail(email: string) {
  if (!isAdminSdkConfigured()) return null;

  const normalized = email.trim().toLowerCase();
  const snapshot = await getAdminFirestore()
    .collection('users')
    .where('email', '==', normalized)
    .limit(1)
    .get();

  const doc = snapshot.docs[0];
  if (!doc) return null;
  return getInviteContextForUser(doc.id);
}
