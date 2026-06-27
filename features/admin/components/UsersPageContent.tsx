'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Spinner } from '../../../components/ui/Spinner';
import { Button } from '../../../components/ui/Button';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { useAuth } from '../../auth/providers/AuthProvider';
import type { InviteStatus } from '../../../lib/schemas/invitation';
import { USER_ROLE_LABELS } from '../../../lib/schemas/user';
import { InviteEmailPreview } from './InviteEmailPreview';
import {
  CreateUserModal,
  formatLastActive,
  InviteComposerModal,
  ManageUserModal,
  type AdminUserRow,
  type InviteDraft,
  type InviteResult,
  type LastInvitationInfo,
} from './UserManagementModals';

const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  sent: 'Sent',
  pending: 'Pending',
  failed: 'Failed',
};

function InviteStatusBanner({
  result,
  onEditResend,
  busy,
}: {
  result: InviteResult;
  onEditResend: () => void;
  busy: boolean;
}) {
  const [showPreview, setShowPreview] = useState(true);
  const email = result.user.email ?? 'user';
  const status = result.inviteStatus;

  const tone =
    status === 'sent'
      ? 'border-emerald-500/30 bg-emerald-950/20'
      : status === 'pending'
        ? 'border-amber-500/30 bg-amber-950/20'
        : 'border-red-500/30 bg-red-950/20';

  return (
    <div className={`border p-4 space-y-3 ${tone}`}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[10px] tracking-caps uppercase text-muted">Latest invite</p>
        <span className="text-xs tracking-caps uppercase text-primary">
          {INVITE_STATUS_LABELS[status]}
        </span>
      </div>

      {status === 'sent' ? (
        <div className="space-y-2">
          <p className="text-sm text-secondary font-light">
            {result.emailDeliveryMethod === 'firebase' ? (
              <>
                Password-set email sent to <span className="text-primary">{email}</span> via Firebase
                (Resend test mode). After they set a password, they land on your branded welcome page.
              </>
            ) : (
              <>
                Branded invite email sent to <span className="text-primary">{email}</span>.
              </>
            )}
          </p>
          {result.inviteWelcomeUrl ? (
            <p className="text-xs text-muted font-light break-all">
              Welcome page: {result.inviteWelcomeUrl}
            </p>
          ) : null}
        </div>
      ) : null}

      {status === 'pending' ? (
        <p className="text-sm text-secondary font-light">
          Account ready for <span className="text-primary">{email}</span>, but email was not
          sent{result.error ? ` (${result.error})` : ''}. Customize and resend, or copy the link
          below.
        </p>
      ) : null}

      {status === 'failed' ? (
        <div className="space-y-2">
          <p className="text-sm text-red-300/90 font-light">
            Invite failed for <span className="text-primary">{email}</span>
            {result.error ? `: ${result.error}` : '.'}
          </p>
          {result.passwordResetUrl ? (
            <p className="text-xs text-secondary font-light">
              The account and password-set link were still created — copy the link below and send it to
              your partner directly (Slack, text, etc.).
            </p>
          ) : null}
        </div>
      ) : null}

      {result.passwordResetUrl ? (
        <div className="space-y-2">
          <p className="text-[10px] tracking-caps uppercase text-muted">Password set link</p>
          <p className="text-xs text-primary break-all font-light">{result.passwordResetUrl}</p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void navigator.clipboard.writeText(result.passwordResetUrl ?? '')}
          >
            Copy Link
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={onEditResend} disabled={busy}>
          Customize & resend
        </Button>
        <Button type="button" variant="ghost" onClick={() => setShowPreview((open) => !open)}>
          {showPreview ? 'Hide preview' : 'Show preview'}
        </Button>
      </div>

      {showPreview ? (
        <InviteEmailPreview fields={result.previewFields} enabled={showPreview} fill />
      ) : null}
    </div>
  );
}

interface ResendComposerState {
  targetUid: string;
  user: AdminUserRow;
  draft: InviteDraft;
  lastInvitation: LastInvitationInfo | null;
}

interface EmailConfig {
  configured: boolean;
  sandboxMode: boolean;
  fromAddress: string;
}

function ResendSandboxNotice({ config }: { config: EmailConfig }) {
  if (!config.configured || !config.sandboxMode) return null;

  return (
    <div className="border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
      <p className="text-[10px] tracking-caps uppercase text-amber-200/90">Email delivery — test mode</p>
      <p className="text-sm text-secondary font-light">
        Resend is on <span className="text-primary">{config.fromAddress}</span> (test sender only). Partner
        invites automatically fall back to Firebase password email, then your branded welcome page at{' '}
        <span className="text-primary">/invite/…</span> after they set a password.
      </p>
      <p className="text-xs text-muted font-light">
        For the full branded email in their inbox, verify{' '}
        <span className="text-primary">tptpeptides.com</span> at{' '}
        <a
          href="https://resend.com/domains"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-light hover:text-gold underline-offset-2 hover:underline"
        >
          resend.com/domains
        </a>{' '}
        and set <span className="text-primary">RESEND_FROM_EMAIL=invites@tptpeptides.com</span>.
      </p>
    </div>
  );
}

export function UsersPageContent() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);
  const [manageUser, setManageUser] = useState<AdminUserRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resendComposer, setResendComposer] = useState<ResendComposerState | null>(null);
  const [loadingResendFor, setLoadingResendFor] = useState<string | null>(null);

  const myUserRow = useMemo(() => {
    const email = authUser?.email?.trim().toLowerCase();
    if (!email) return null;
    return users.find((row) => row.email?.trim().toLowerCase() === email) ?? null;
  }, [authUser?.email, users]);

  const loadUsers = useCallback(async () => {
    setMessage('');
    const response = await fetch('/api/admin/users');
    if (response.status === 404) {
      window.location.href = '/admin';
      return;
    }
    if (!response.ok) {
      setMessage('Unable to load users.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { users: AdminUserRow[]; emailConfig?: EmailConfig };
    setUsers(data.users);
    setEmailConfig(data.emailConfig ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openResendComposer = async (user: AdminUserRow) => {
    setLoadingResendFor(user.uid);
    setMessage('');

    const response = await fetch(`/api/admin/invitations?targetUid=${encodeURIComponent(user.uid)}`);
    setLoadingResendFor(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setMessage(data.error ?? 'Unable to load invite for this user.');
      return;
    }

    const data = (await response.json()) as {
      draft: InviteDraft;
      lastInvitation: LastInvitationInfo | null;
      targetUid: string;
    };

    setResendComposer({
      targetUid: data.targetUid,
      user,
      draft: data.draft,
      lastInvitation: data.lastInvitation
        ? {
            id: data.lastInvitation.id,
            status: data.lastInvitation.status as InviteStatus,
            invitedAt: data.lastInvitation.invitedAt,
          }
        : null,
    });
  };

  const handleSaved = (uid: string, updates: Partial<AdminUserRow>) => {
    setUsers((current) =>
      current.map((user) => (user.uid === uid ? { ...user, ...updates } : user))
    );
    setMessage('User updated.');
  };

  const handleInviteComplete = (result: InviteResult, existingUser?: AdminUserRow) => {
    if (existingUser) {
      setUsers((current) =>
        current.map((row) =>
          row.uid === existingUser.uid
            ? { ...row, email: result.user.email, role: result.user.role, accessLevel: result.user.accessLevel }
            : row
        )
      );
    } else {
      setUsers((current) => {
        const exists = current.some((row) => row.uid === result.user.uid);
        if (exists) {
          return current.map((row) => (row.uid === result.user.uid ? { ...row, ...result.user } : row));
        }
        return [result.user, ...current];
      });
    }
    setLastInvite(result);
    setResendComposer(null);
    setMessage(
      existingUser
        ? `Invite resent to ${result.user.email ?? 'user'}.`
        : `Invite processed for ${result.user.email ?? 'user'}.`
    );
  };

  if (loading) return <Spinner label="Loading users..." className="py-20" />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User Management"
        subtitle="Partners, staff, roles, and access control"
        beamDelay={3}
        actions={
          <div className="flex flex-wrap gap-2">
            {myUserRow ? (
              <Button
                type="button"
                variant="ghost"
                disabled={loadingResendFor === myUserRow.uid}
                onClick={() => void openResendComposer(myUserRow)}
              >
                {loadingResendFor === myUserRow.uid ? 'Loading…' : 'My invite'}
              </Button>
            ) : null}
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Invite User
            </Button>
          </div>
        }
      />

      {message ? <p className="text-sm text-secondary font-light">{message}</p> : null}

      {emailConfig ? <ResendSandboxNotice config={emailConfig} /> : null}

      {lastInvite ? (
        <InviteStatusBanner
          result={lastInvite}
          busy={loadingResendFor != null}
          onEditResend={() => {
            const match = users.find((row) => row.uid === lastInvite.user.uid);
            if (match) void openResendComposer(match);
          }}
        />
      ) : null}

      <div className="admin-table-section">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Access</th>
              <th>Last Active</th>
              <th>Points</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.uid}>
                <td className="text-primary">{user.email ?? user.uid.slice(0, 8)}</td>
                <td className="text-muted">{USER_ROLE_LABELS[user.role] ?? user.role}</td>
                <td className="text-muted">{user.accessLevel}</td>
                <td className="text-muted text-xs">{formatLastActive(user.lastActive)}</td>
                <td>{user.loyaltyPoints}</td>
                <td className="text-muted">{user.disabled ? 'Disabled' : 'Active'}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={loadingResendFor === user.uid}
                      onClick={() => void openResendComposer(user)}
                    >
                      {loadingResendFor === user.uid ? '…' : 'Invite'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setManageUser(user)}>
                      Manage
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ManageUserModal
        user={manageUser}
        onClose={() => setManageUser(null)}
        onSaved={handleSaved}
      />

      <CreateUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(result) => handleInviteComplete(result)}
      />

      {resendComposer ? (
        <InviteComposerModal
          isOpen
          mode="resend"
          targetUid={resendComposer.targetUid}
          initialDraft={resendComposer.draft}
          lastInvitation={resendComposer.lastInvitation}
          onClose={() => setResendComposer(null)}
          onComplete={(result) => handleInviteComplete(result, resendComposer.user)}
        />
      ) : null}
    </div>
  );
}
