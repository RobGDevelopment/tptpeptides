'use client';

import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  ROLE_ACCESS_LEVELS,
  USER_ROLE_LABELS,
  type UserRole,
} from '../../../lib/schemas/user';

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

const STAFF_ROLES: UserRole[] = ['admin', 'partner', 'staff'];

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
    const response = await fetch('/api/admin/users', {
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
    const response = await fetch('/api/admin/users', {
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
    const response = await fetch('/api/admin/users', {
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
            {(['admin', 'partner', 'staff', 'user'] as UserRole[]).map((option) => (
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

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (user: AdminUserRow, resetLink: string) => void;
}

export function CreateUserModal({ isOpen, onClose, onCreated }: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'partner' | 'staff'>('staff');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setEmail('');
    setRole('staff');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError('');

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });

    setCreating(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to create user.');
      return;
    }

    const data = (await response.json()) as {
      uid: string;
      email: string;
      role: UserRole;
      accessLevel: number;
      resetLink: string;
    };

    onCreated(
      {
        uid: data.uid,
        email: data.email,
        role: data.role,
        accessLevel: data.accessLevel,
        disabled: false,
        lastActive: null,
        createdBy: null,
        loyaltyPoints: 0,
      },
      data.resetLink
    );
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} panelClassName="max-w-lg">
      <form className="space-y-6" onSubmit={(event) => void createUser(event)}>
        <div>
          <p className="text-[10px] tracking-caps uppercase text-muted">Invite User</p>
          <h2 className="text-lg font-light text-primary mt-2">Create Partner or Staff</h2>
          <p className="text-xs text-muted mt-2 font-light">
            A password reset link is generated so the user can set their credentials.
          </p>
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="off"
        />

        <div className="space-y-2">
          <label htmlFor="create-role" className="text-[10px] tracking-caps uppercase text-muted">
            Role
          </label>
          <select
            id="create-role"
            value={role}
            onChange={(event) => setRole(event.target.value as 'admin' | 'partner' | 'staff')}
            className="w-full bg-void/60 border border-white/10 px-4 py-3 text-sm text-primary font-light focus:outline-none focus:border-gold/30"
          >
            {STAFF_ROLES.map((option) => (
              <option key={option} value={option}>
                {USER_ROLE_LABELS[option]} ({ROLE_ACCESS_LEVELS[option]})
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-red-400/90 font-light">{error}</p> : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={creating}>
            Create User
          </Button>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
        </div>
      </form>
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
