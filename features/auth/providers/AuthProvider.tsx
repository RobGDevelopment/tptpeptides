'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { logoutUser, resolveUserRole, subscribeToAuthChanges } from '../../../lib/firebase/auth';
import { fetchServerAdminStatus } from '../../../lib/firebase/session';
import type { UserRole } from '../types';

/** Client-side fallback when server session APIs fail — matches firestore.rules master admin. */
function isKnownMasterAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === 'rjg.cal@gmail.com';
}

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [serverAdmin, setServerAdmin] = useState(false);
  const [masterAdmin, setMasterAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      if (cancelled) return;

      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setServerAdmin(false);
        setMasterAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      void (async () => {
        const [resolvedRole, authStatus] = await Promise.all([
          resolveUserRole(currentUser),
          fetchServerAdminStatus(),
        ]);

        if (!cancelled) {
          setRole(resolvedRole);
          setServerAdmin(authStatus.isAdmin);
          setMasterAdmin(authStatus.isMasterAdmin);
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
      isAdmin:
        role === 'admin' ||
        serverAdmin ||
        Boolean(user?.email && isKnownMasterAdminEmail(user.email)),
      isMasterAdmin: masterAdmin || Boolean(user?.email && isKnownMasterAdminEmail(user.email)),
      loading,
      signOut: logoutUser,
    }),
    [user, role, serverAdmin, masterAdmin, loading]
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
