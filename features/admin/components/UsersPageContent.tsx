'use client';

import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '../../../components/ui/Spinner';
import { Button } from '../../../components/ui/Button';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { USER_ROLE_LABELS } from '../../../lib/schemas/user';
import {
  CreateUserModal,
  formatLastActive,
  ManageUserModal,
  type AdminUserRow,
} from './UserManagementModals';

export function UsersPageContent() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [manageUser, setManageUser] = useState<AdminUserRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
    const data = (await response.json()) as { users: AdminUserRow[] };
    setUsers(data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSaved = (uid: string, updates: Partial<AdminUserRow>) => {
    setUsers((current) =>
      current.map((user) => (user.uid === uid ? { ...user, ...updates } : user))
    );
    setMessage('User updated.');
  };

  const handleCreated = (user: AdminUserRow, resetLink: string) => {
    setUsers((current) => [user, ...current]);
    setInviteLink(resetLink);
    setMessage(`Invited ${user.email}. Share the password reset link below.`);
  };

  if (loading) return <Spinner label="Loading users..." className="py-20" />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User Management"
        subtitle="Partners, staff, roles, and access control"
        beamDelay={3}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Create New User
          </Button>
        }
      />

      {message ? <p className="text-sm text-secondary font-light">{message}</p> : null}

      {inviteLink ? (
        <div className="border border-white/10 bg-surface/40 p-4 space-y-2">
          <p className="text-[10px] tracking-caps uppercase text-muted">Password reset link</p>
          <p className="text-xs text-primary break-all font-light">{inviteLink}</p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void navigator.clipboard.writeText(inviteLink)}
          >
            Copy Link
          </Button>
        </div>
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
                  <Button type="button" variant="ghost" onClick={() => setManageUser(user)}>
                    Manage
                  </Button>
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
        onCreated={handleCreated}
      />
    </div>
  );
}
