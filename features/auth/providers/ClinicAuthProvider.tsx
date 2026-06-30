'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '../../../lib/supabase/client';

interface ClinicAuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const ClinicAuthContext = createContext<ClinicAuthContextValue | null>(null);

export function ClinicAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (cancelled) return;
      setSession(initialSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<ClinicAuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, supabase]
  );

  return <ClinicAuthContext.Provider value={value}>{children}</ClinicAuthContext.Provider>;
}

export function useClinicAuth(): ClinicAuthContextValue {
  const context = useContext(ClinicAuthContext);
  if (!context) {
    throw new Error('useClinicAuth must be used within ClinicAuthProvider');
  }
  return context;
}
