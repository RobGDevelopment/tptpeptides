'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../auth/providers/AuthProvider';
import {
  INVITE_PERSONA_LABELS,
  type InvitePersona,
  type InviteStatus,
} from '../../../lib/schemas/invitation';
import {
  ADMIN_PORTAL_ROLES,
  ROLE_ACCESS_LEVELS,
  USER_ROLE_LABELS,
  type AdminStaffRole,
  type InstitutionTier,
  type UserRole,
} from '../../../lib/schemas/user';
import { InviteEmailPreview, type InvitePreviewFields } from './InviteEmailPreview';
import { SITE_URL_VERCEL } from '../../../lib/brand';

export interface AdminUserRow {
  uid: string;
  email: string | null;
  role: UserRole;
  accessLevel: number;
  disabled: boolean;
  lastActive: string | null;
  createdBy: string | null;
  loyaltyPoints: number;
}

const STAFF_ROLES: UserRole[] = [...ADMIN_PORTAL_ROLES];

interface ManageUserModalProps {
  user: AdminUserRow | null;
  onClose: () => void;
  onSaved: (uid: string, updates: Partial<AdminUserRow>) => void;
}

export function ManageUserModal({ user, onClose, onSaved }: ManageUserModalProps) {
  const [role, setRole] = useState<UserRole>('user');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setError('');
    }
  }, [user]);

  if (!user) return null;

  const saveRole = async () => {
    setSaving(true);
    setError('');
    const response = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, role }),
    });
    setSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to update role.');
      return;
    }

    onSaved(user.uid, { role, accessLevel: ROLE_ACCESS_LEVELS[role] });
    onClose();
  };

  const revokeAccess = async () => {
    if (!window.confirm(`Revoke access for ${user.email ?? user.uid}?`)) return;

    setSaving(true);
    setError('');
    const response = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, disabled: true }),
    });
    setSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to revoke access.');
      return;
    }

    onSaved(user.uid, { disabled: true });
    onClose();
  };

  const restoreAccess = async () => {
    setSaving(true);
    setError('');
    const response = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, disabled: false }),
    });
    setSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to restore access.');
      return;
    }

    onSaved(user.uid, { disabled: false });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} panelClassName="max-w-lg">
      <div className="space-y-6">
        <div>
          <p className="text-[10px] tracking-caps uppercase text-muted">Manage User</p>
          <h2 className="text-lg font-light text-primary mt-2">{user.email ?? user.uid}</h2>
          <p className="text-xs text-muted mt-1 font-light">
            Access level {user.accessLevel} · {user.disabled ? 'Disabled' : 'Active'}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="manage-role" className="text-[10px] tracking-caps uppercase text-muted">
            Role
          </label>
          <select
            id="manage-role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="w-full bg-void/60 border border-white/10 px-4 py-3 text-sm text-primary font-light focus:outline-none focus:border-gold/30"
          >
            {([...ADMIN_PORTAL_ROLES, 'user'] as UserRole[]).map((option) => (
              <option key={option} value={option}>
                {USER_ROLE_LABELS[option]} ({ROLE_ACCESS_LEVELS[option]})
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-red-400/90 font-light">{error}</p> : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button" onClick={() => void saveRole()} disabled={saving}>
            Save Role
          </Button>
          {user.disabled ? (
            <Button type="button" variant="ghost" onClick={() => void restoreAccess()} disabled={saving}>
              Restore Access
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => void revokeAccess()} disabled={saving}>
              Revoke Access
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface InviteComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'resend';
  targetUid?: string;
  initialDraft?: Partial<InviteDraft>;
  lastInvitation?: LastInvitationInfo | null;
  onComplete: (result: InviteResult) => void;
}

export interface InviteDraft {
  email: string;
  persona: InvitePersona;
  role?: AdminStaffRole;
  institutionTier?: InstitutionTier;
  institutionName?: string;
  personalNote?: string;
}

export interface LastInvitationInfo {
  id: string;
  status: InviteStatus;
  invitedAt: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (result: InviteResult) => void;
}

/** Opens empty composer for a new user invite. */
export function CreateUserModal({ isOpen, onClose, onCreated }: CreateUserModalProps) {
  return (
    <InviteComposerModal
      isOpen={isOpen}
      onClose={onClose}
      mode="create"
      onComplete={onCreated}
    />
  );
}

export interface InviteResult {
  user: AdminUserRow;
  inviteId: string;
  inviteStatus: InviteStatus;
  emailDeliveryMethod?: 'resend' | 'firebase';
  inviteWelcomeUrl?: string;
  passwordResetUrl?: string;
  error?: string;
  previewFields: InvitePreviewFields;
}

const PERSONA_OPTIONS: InvitePersona[] = [
  'staff_partner',
  'lab_buyer',
  'first_purchase',
  'super_admin',
];

export function InviteComposerModal({
  isOpen,
  onClose,
  mode,
  targetUid,
  initialDraft,
  lastInvitation,
  onComplete,
}: InviteComposerModalProps) {
  const { isMasterAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [persona, setPersona] = useState<InvitePersona>('staff_partner');
  const [role, setRole] = useState<AdminStaffRole>('ops');
  const [institutionTier, setInstitutionTier] = useState<InstitutionTier>('Bronze');
  const [institutionName, setInstitutionName] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isResend = mode === 'resend';

  useEffect(() => {
    if (!isOpen || !initialDraft) return;
    setEmail(initialDraft.email ?? '');
    setPersona(initialDraft.persona ?? 'staff_partner');
    setRole(initialDraft.role ?? 'ops');
    setInstitutionTier(initialDraft.institutionTier ?? 'Bronze');
    setInstitutionName(initialDraft.institutionName ?? '');
    setPersonalNote(initialDraft.personalNote ?? '');
    setError('');
  }, [isOpen, initialDraft]);

  const visiblePersonas = useMemo(
    () =>
      isMasterAdmin
        ? PERSONA_OPTIONS
        : PERSONA_OPTIONS.filter((option) => option !== 'super_admin'),
    [isMasterAdmin]
  );

  const previewFields = useMemo(
    () => ({
      email,
      persona,
      role: persona === 'staff_partner' ? role : undefined,
      institutionTier: persona === 'lab_buyer' ? institutionTier : undefined,
      institutionName: persona === 'lab_buyer' ? institutionName : undefined,
      personalNote,
    }),
    [email, persona, role, institutionTier, institutionName, personalNote]
  );

  const reset = () => {
    setEmail('');
    setPersona('staff_partner');
    setRole('ops');
    setInstitutionTier('Bronze');
    setInstitutionName('');
    setPersonalNote('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const body: Record<string, unknown> = {
      email,
      persona,
      personalNote: personalNote.trim() || undefined,
    };

    if (persona === 'staff_partner') body.role = role;
    if (persona === 'lab_buyer') {
      body.institutionTier = institutionTier;
      if (institutionName.trim()) body.institutionName = institutionName.trim();
    }

    if (isResend) {
      if (!targetUid) {
        setError('Missing user for resend.');
        setSubmitting(false);
        return;
      }
      body.targetUid = targetUid;
    }

    const response = await fetch(
      isResend ? '/api/admin/invitations/resend' : '/api/admin/users',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    setSubmitting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? (isResend ? 'Unable to resend invite.' : 'Unable to create user.'));
      return;
    }

    const data = (await response.json()) as {
      uid: string;
      email: string;
      role: UserRole;
      accessLevel: number;
      inviteId: string;
      inviteStatus: InviteStatus;
      emailDeliveryMethod?: 'resend' | 'firebase';
      inviteWelcomeUrl?: string;
      passwordResetUrl?: string;
      error?: string;
    };

    onComplete({
      user: {
        uid: data.uid,
        email: data.email,
        role: data.role,
        accessLevel: data.accessLevel,
        disabled: false,
        lastActive: null,
        createdBy: null,
        loyaltyPoints: 0,
      },
      inviteId: data.inviteId,
      inviteStatus: data.inviteStatus,
      emailDeliveryMethod: data.emailDeliveryMethod,
      inviteWelcomeUrl: data.inviteWelcomeUrl,
      passwordResetUrl: data.passwordResetUrl,
      error: data.error,
      previewFields,
    });
    reset();
    onClose();
  };

  const lastInviteLabel = lastInvitation
    ? `Last invite: ${lastInvitation.status} · ${new Date(lastInvitation.invitedAt).toLocaleString()}`
    : isResend
      ? 'No prior invite on record — defaults loaded from user profile.'
      : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant="fullscreen">
      <div className="relative flex flex-col h-full min-h-0 overflow-hidden">
        <header className="shrink-0 flex flex-wrap items-center gap-4 md:gap-6 px-5 md:px-8 py-4 md:py-5 border-b border-white/5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-caps uppercase text-muted">
              {isResend ? 'Resend Invite' : 'Invite User'}
            </p>
            <h2 className="text-lg md:text-xl font-light text-primary mt-1">
              {isResend ? 'Customize & Resend' : 'Send Branded Invite'}
            </h2>
            <p className="text-xs text-muted font-light mt-2">
              {isResend
                ? 'Edit the message below, preview on the right, then resend. Partners use'
                : 'Partners receive links to'}{' '}
              <span className="text-gold-light">{SITE_URL_VERCEL.replace(/^https:\/\//, '')}</span>
              {isResend ? '.' : ' — the live Vercel preview (not localhost).'}
            </p>
            {lastInviteLabel ? (
              <p className="text-xs text-muted/80 font-light mt-1">{lastInviteLabel}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <label className="sr-only" htmlFor="create-persona">
              Invite persona
            </label>
            <select
              id="create-persona"
              value={persona}
              onChange={(event) => setPersona(event.target.value as InvitePersona)}
              className="bg-transparent border-0 border-b border-white/15 px-0 py-1.5 text-sm text-primary font-light focus:outline-none focus:border-gold/40 cursor-pointer"
            >
              {visiblePersonas.map((option) => (
                <option key={option} value={option} className="bg-void text-primary">
                  {INVITE_PERSONA_LABELS[option].label}
                </option>
              ))}
            </select>

            {persona === 'staff_partner' ? (
              <>
                <span className="hidden sm:inline text-white/15">·</span>
                <label className="sr-only" htmlFor="create-role">
                  Role
                </label>
                <select
                  id="create-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as AdminStaffRole)}
                  className="bg-transparent border-0 border-b border-white/15 px-0 py-1.5 text-sm text-primary font-light focus:outline-none focus:border-gold/40 cursor-pointer"
                >
                  {STAFF_ROLES.map((option) => (
                    <option key={option} value={option} className="bg-void text-primary">
                      {USER_ROLE_LABELS[option]}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            {persona === 'lab_buyer' ? (
              <>
                <span className="hidden sm:inline text-white/15">·</span>
                <label className="sr-only" htmlFor="create-tier">
                  Institution tier
                </label>
                <select
                  id="create-tier"
                  value={institutionTier}
                  onChange={(event) => setInstitutionTier(event.target.value as InstitutionTier)}
                  className="bg-transparent border-0 border-b border-white/15 px-0 py-1.5 text-sm text-primary font-light focus:outline-none focus:border-gold/40 cursor-pointer"
                >
                  <option value="Bronze" className="bg-void text-primary">
                    Bronze
                  </option>
                  <option value="Silver" className="bg-void text-primary">
                    Silver
                  </option>
                  <option value="Gold" className="bg-void text-primary">
                    Gold
                  </option>
                </select>
              </>
            ) : null}

            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" form="invite-composer-form" disabled={submitting}>
                {submitting ? 'Sending…' : isResend ? 'Resend Invite' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 min-h-0 overflow-hidden grid-cols-1 lg:grid-cols-2">
          <form
            id="invite-composer-form"
            className="flex flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5"
            onSubmit={(event) => void submitInvite(event)}
          >
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-5 md:px-8 py-6 md:py-8">
              <label htmlFor="create-email" className="sr-only">
                Recipient email
              </label>
              <input
                id="create-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                readOnly={isResend}
                required
                autoComplete="off"
                placeholder="Recipient email address"
                className="w-full shrink-0 bg-transparent border-0 p-0 text-2xl md:text-3xl font-light text-primary placeholder:text-muted/40 focus:outline-none read-only:opacity-90"
              />

              <p className="mt-3 text-xs text-muted font-light shrink-0">
                {INVITE_PERSONA_LABELS[persona].description}
              </p>

              {persona === 'lab_buyer' ? (
                <input
                  id="create-institution"
                  type="text"
                  value={institutionName}
                  onChange={(event) => setInstitutionName(event.target.value)}
                  autoComplete="off"
                  placeholder="Institution name (optional)"
                  className="mt-6 w-full shrink-0 bg-transparent border-0 border-b border-white/10 py-2 text-lg font-light text-primary placeholder:text-muted/40 focus:outline-none focus:border-gold/30"
                />
              ) : null}

              <label htmlFor="create-note" className="sr-only">
                Personal note
              </label>
              <textarea
                id="create-note"
                value={personalNote}
                onChange={(event) => setPersonalNote(event.target.value)}
                maxLength={500}
                placeholder="Personal note for the recipient — appears in the invite email when provided."
                className="mt-6 md:mt-8 flex-1 min-h-[12rem] w-full bg-transparent border-0 p-0 text-base md:text-lg leading-relaxed text-primary font-light placeholder:text-muted/35 focus:outline-none resize-none"
              />
            </div>

            {error ? (
              <p className="shrink-0 px-5 md:px-8 pb-4 text-sm text-red-400/90 font-light">{error}</p>
            ) : null}
          </form>

          <InviteEmailPreview fields={previewFields} enabled={isOpen} fill />
        </div>
      </div>
    </Modal>
  );
}

function formatLastActive(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

export { formatLastActive };
