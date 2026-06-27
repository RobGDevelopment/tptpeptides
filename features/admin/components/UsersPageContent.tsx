'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '../../../components/ui/Spinner';
import { Button } from '../../../components/ui/Button';

interface AdminUserRow {
  uid: string;
  email: string | null;
  role: string;
  disabled: boolean;
  loyaltyPoints: number;
}

export function UsersPageContent() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) return;
        const data = (await response.json()) as { users: AdminUserRow[] };
        setUsers(data.users);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateUser = async (uid: string, updates: { role?: 'admin' | 'customer'; disabled?: boolean }) => {
    setMessage('');
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...updates }),
    });

    if (response.ok) {
      setUsers((current) =>
        current.map((user) =>
          user.uid === uid
            ? {
                ...user,
                role: updates.role ?? user.role,
                disabled: updates.disabled ?? user.disabled,
              }
            : user
        )
      );
      setMessage('User updated.');
    } else {
      setMessage('Update failed.');
    }
  };

  if (loading) return <Spinner label="Loading users..." className="py-20" />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="admin-heading">User Management</h1>
        <p className="admin-subheading">Assign roles and disable accounts</p>
      </header>

      {message && <p className="text-sm text-secondary font-light">{message}</p>}

      <div className="admin-table-section">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Points</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.uid}>
                <td className="text-primary">{user.email ?? user.uid.slice(0, 8)}</td>
                <td className="capitalize text-muted">{user.role}</td>
                <td>{user.loyaltyPoints}</td>
                <td className="text-muted">{user.disabled ? 'Disabled' : 'Active'}</td>
                <td className="space-x-4">
                  {user.role !== 'admin' ? (
                    <Button type="button" variant="ghost" onClick={() => updateUser(user.uid, { role: 'admin' })}>
                      Make Admin
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" onClick={() => updateUser(user.uid, { role: 'customer' })}>
                      Revoke Admin
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => updateUser(user.uid, { disabled: !user.disabled })}
                  >
                    {user.disabled ? 'Enable' : 'Disable'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
