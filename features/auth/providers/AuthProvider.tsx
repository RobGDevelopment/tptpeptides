'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { logoutUser, resolveUserRole, subscribeToAuthChanges } from '../../../lib/firebase/auth';
import { fetchServerAdminStatus } from '../../../lib/firebase/session';
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
  const [serverAdmin, setServerAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      if (cancelled) return;

      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setServerAdmin(false);
        setLoading(false);
        return;
      }

      void (async () => {
        const [resolvedRole, isAdminFromServer] = await Promise.all([
          resolveUserRole(currentUser),
          fetchServerAdminStatus(),
        ]);

        if (!cancelled) {
          setRole(resolvedRole);
          setServerAdmin(isAdminFromServer);
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
      isAdmin: role === 'admin' || serverAdmin,
      loading,
      signOut: logoutUser,
    }),
    [user, role, serverAdmin, loading]
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
