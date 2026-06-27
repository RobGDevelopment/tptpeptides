'use client';

import { useEffect } from 'react';
import { AuthProvider } from '../features/auth/providers/AuthProvider';
import { initFirebaseClient } from '../lib/firebase/client';

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initFirebaseClient();
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}