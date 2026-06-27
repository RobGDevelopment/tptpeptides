'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { logoutUser, resolveUserRole, subscribeToAuthChanges } from '../../../lib/firebase/auth';
import type { UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      if (cancelled) return;

      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      void (async () => {
        const resolvedRole = await resolveUserRole(currentUser);
        if (!cancelled) {
          setRole(resolvedRole);
          setLoading(false);
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      role,
      isAdmin: role === 'admin',
      loading,
      signOut: logoutUser,
    }),
    [user, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
