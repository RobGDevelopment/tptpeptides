import 'server-only';



import { randomBytes } from 'crypto';

import { isMasterAdminEmail } from '../admin/masterAdmin';

import { syncMasterAdminAccess } from '../admin/syncMasterAdmin.server';

import type { AdminUserInviteInput, InviteStatus } from '../schemas/invitation';

import type { InstitutionTier, UserRole } from '../schemas/user';

import { accessLevelForRole, normalizeUserRole } from '../schemas/user';
import { DEFAULT_TENANT_ID } from '../tenant/constants';

import {

  deliverPersonaInviteEmail,

  roleLabelForInvite,

  type InviteEmailDeliveryMethod,

} from './inviteDelivery.server';

import { getInviteUrls } from './inviteUrls.server';

import { generateInvitePasswordResetLink } from './invitePasswordReset.server';

import { getAdminAuth, getAdminFirestore, isAdminSdkConfigured } from '../firebase/admin';



export interface InviteEngineResult {

  uid: string;

  email: string;

  role: UserRole;

  accessLevel: number;

  persona: AdminUserInviteInput['persona'];

  inviteId: string;

  inviteStatus: InviteStatus;

  emailSent: boolean;

  emailDeliveryMethod?: InviteEmailDeliveryMethod;

  inviteWelcomeUrl?: string;

  accountCreated: boolean;

  error?: string;

  /** When email was not sent — admin fallback copy */

  passwordResetUrl?: string;

}



function inviteUrls(siteUrl?: string) {

  return getInviteUrls(siteUrl);

}



/** Firestore rejects undefined field values — omit them before write. */

function firestoreRecord(data: Record<string, unknown>): Record<string, unknown> {

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

}



function roleForPersona(

  persona: AdminUserInviteInput['persona'],

  role?: AdminUserInviteInput['role']

): UserRole {

  switch (persona) {

    case 'super_admin':

      return 'admin';

    case 'staff_partner':

      return role ?? 'ops';

    case 'lab_buyer':

    case 'first_purchase':

      return 'user';

  }

}



async function ensureAuthUser(email: string): Promise<{ uid: string; created: boolean }> {

  const auth = getAdminAuth();

  const normalized = email.trim().toLowerCase();



  try {

    const existing = await auth.getUserByEmail(normalized);

    return { uid: existing.uid, created: false };

  } catch (error) {

    const code =

      typeof error === 'object' && error != null && 'code' in error

        ? String((error as { code: string }).code)

        : '';

    if (code !== 'auth/user-not-found') throw error;

  }



  const userRecord = await auth.createUser({

    email: normalized,

    password: randomBytes(24).toString('base64url'),

    emailVerified: false,

  });



  return { uid: userRecord.uid, created: true };

}



/** Provisions user, writes invitation record, sends branded persona email. */

export async function sendPersonaInvite(

  input: AdminUserInviteInput & { invitedBy: string }

): Promise<InviteEngineResult> {

  if (!isAdminSdkConfigured()) {

    throw new Error('Firebase Admin SDK is not configured');

  }



  const auth = getAdminAuth();

  const db = getAdminFirestore();

  const email = input.email.trim().toLowerCase();

  const role = roleForPersona(input.persona, input.role);

  const accessLevel = accessLevelForRole(role);

  const inviteSiteUrl = input.siteUrl;

  const urls = inviteUrls(inviteSiteUrl);

  const invitedAt = new Date().toISOString();

  const inviteRef = db.collection('invitations').doc();

  const inviteId = inviteRef.id;

  const welcomePath = `/invite/${inviteId}`;

  const inviteWelcomeUrl = urls.inviteWelcomeUrl(inviteId);



  const { uid, created } = await ensureAuthUser(email);



  const userUpdates: Record<string, unknown> = {

    uid,

    email,

    role,

    accessLevel,

    disabled: false,

    tenantId: DEFAULT_TENANT_ID,

    invitePersona: input.persona,

    invitedAt,

    invitedBy: input.invitedBy,

    createdBy: input.invitedBy,

  };



  if (created) {

    userUpdates.createdAt = invitedAt;

    userUpdates.lastActive = null;

    userUpdates.loyaltyPoints = 0;

    userUpdates.totalPointsEarned = 0;

  }



  if (input.persona === 'lab_buyer') {

    userUpdates.institutionTier = input.institutionTier ?? 'Bronze';

    userUpdates.institutionVerified = false;

    if (input.institutionName?.trim()) {

      userUpdates.institutionName = input.institutionName.trim();

    }

  }



  if (isMasterAdminEmail(email)) {

    await syncMasterAdminAccess(uid, email);

  } else if (input.persona === 'super_admin' || role === 'admin') {

    await auth.setCustomUserClaims(uid, { admin: true, role: 'admin', tenantId: DEFAULT_TENANT_ID });

  } else if (role === 'ops' || role === 'finance' || role === 'sales' || role === 'support') {

    await auth.setCustomUserClaims(uid, { admin: false, role, tenantId: DEFAULT_TENANT_ID });

  }



  await db.collection('users').doc(uid).set(userUpdates, { merge: true });



  let passwordResetUrl: string;

  try {

    passwordResetUrl = await generateInvitePasswordResetLink(email, inviteSiteUrl, welcomePath);

  } catch (error) {

    const message = error instanceof Error ? error.message : 'Password link failed';

    await inviteRef.set(

      firestoreRecord({

        email,

        persona: input.persona,

        status: 'failed',

        targetUid: uid,

        invitedBy: input.invitedBy,

        invitedAt,

        inviteWelcomeUrl,

        error: message,

        institutionTier: input.institutionTier,

        institutionName: input.institutionName,

        personalNote: input.personalNote,

      })

    );



    return {

      uid,

      email,

      role,

      accessLevel,

      persona: input.persona,

      inviteId,

      inviteStatus: 'failed',

      emailSent: false,

      accountCreated: created,

      inviteWelcomeUrl,

      error: message,

    };

  }



  const delivery = await deliverPersonaInviteEmail({

    email,

    persona: input.persona,

    passwordResetUrl,

    welcomeContinueUrl: inviteWelcomeUrl,

    roleLabel: roleLabelForInvite(input.persona, input.role),

    institutionTier: input.institutionTier as InstitutionTier | undefined,

    institutionName: input.institutionName,

    personalNote: input.personalNote,

    ...urls,

  });



  await inviteRef.set(

    firestoreRecord({

      email,

      persona: input.persona,

      status: delivery.inviteStatus,

      targetUid: uid,

      invitedBy: input.invitedBy,

      invitedAt,

      resendMessageId: delivery.resendMessageId,

      emailDeliveryMethod: delivery.deliveryMethod,

      inviteWelcomeUrl,

      error: delivery.error,

      accountCreated: created,

      institutionTier: input.institutionTier,

      institutionName: input.institutionName,

      personalNote: input.personalNote,

    })

  );



  return {

    uid,

    email,

    role,

    accessLevel,

    persona: input.persona,

    inviteId,

    inviteStatus: delivery.inviteStatus,

    emailSent: delivery.emailSent,

    emailDeliveryMethod: delivery.deliveryMethod,

    inviteWelcomeUrl,

    accountCreated: created,

    error: delivery.error,

    passwordResetUrl: delivery.inviteStatus !== 'sent' ? passwordResetUrl : undefined,

  };

}



/** Regenerates password link and resends branded invite for an existing invitation. */

export async function resendPersonaInvite(params: {

  inviteId: string;

  invitedBy: string;

  siteUrl?: string;

}): Promise<InviteEngineResult> {

  if (!isAdminSdkConfigured()) {

    throw new Error('Firebase Admin SDK is not configured');

  }



  const db = getAdminFirestore();

  const inviteDoc = await db.collection('invitations').doc(params.inviteId).get();



  if (!inviteDoc.exists) {

    throw new Error('Invitation not found');

  }



  const data = inviteDoc.data() ?? {};

  const email = String(data.email ?? '').trim().toLowerCase();

  const persona = data.persona as AdminUserInviteInput['persona'];

  const targetUid = String(data.targetUid ?? '');



  if (!email || !persona || !targetUid) {

    throw new Error('Invitation record is incomplete');

  }



  const userDoc = await db.collection('users').doc(targetUid).get();

  const role = normalizeUserRole(userDoc.data()?.role as string | undefined);

  const accessLevel = accessLevelForRole(role);

  const urls = inviteUrls(params.siteUrl);

  const welcomePath = `/invite/${params.inviteId}`;

  const inviteWelcomeUrl = urls.inviteWelcomeUrl(params.inviteId);



  let passwordResetUrl: string;

  try {

    passwordResetUrl = await generateInvitePasswordResetLink(email, params.siteUrl, welcomePath);

  } catch (error) {

    const message = error instanceof Error ? error.message : 'Password link failed';

    await inviteDoc.ref.set({ status: 'failed', error: message, lastResentAt: new Date().toISOString() }, { merge: true });

    throw new Error(message);

  }



  const staffRole =
    role === 'admin'
      ? ('admin' as const)
      : role === 'finance'
        ? ('finance' as const)
        : role === 'sales'
          ? ('sales' as const)
          : role === 'support'
            ? ('support' as const)
            : ('ops' as const);



  const delivery = await deliverPersonaInviteEmail({

    email,

    persona,

    passwordResetUrl,

    welcomeContinueUrl: inviteWelcomeUrl,

    roleLabel: roleLabelForInvite(persona, staffRole),

    institutionTier: data.institutionTier as InstitutionTier | undefined,

    institutionName: data.institutionName as string | undefined,

    personalNote: data.personalNote as string | undefined,

    ...urls,

  });



  await inviteDoc.ref.set(

    firestoreRecord({

      status: delivery.inviteStatus,

      resendMessageId: delivery.resendMessageId,

      emailDeliveryMethod: delivery.deliveryMethod,

      inviteWelcomeUrl,

      error: delivery.error,

      lastResentAt: new Date().toISOString(),

      lastResentBy: params.invitedBy,

    }),

    { merge: true }

  );



  return {

    uid: targetUid,

    email,

    role,

    accessLevel,

    persona,

    inviteId: params.inviteId,

    inviteStatus: delivery.inviteStatus,

    emailSent: delivery.emailSent,

    emailDeliveryMethod: delivery.deliveryMethod,

    inviteWelcomeUrl,

    accountCreated: false,

    error: delivery.error,

    passwordResetUrl: delivery.inviteStatus !== 'sent' ? passwordResetUrl : undefined,

  };

}


