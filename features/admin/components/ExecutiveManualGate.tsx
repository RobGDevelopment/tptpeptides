'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/providers/AuthProvider';
import { Spinner } from '../../../components/ui/Spinner';

export function ExecutiveManualGate({ children }: { children: React.ReactNode }) {
  const { loading, canAccessExecutiveManual } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !canAccessExecutiveManual) {
      router.replace('/admin');
    }
  }, [canAccessExecutiveManual, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner label="Opening executive manual..." />
      </div>
    );
  }

  if (!canAccessExecutiveManual) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner label="Redirecting…" />
      </div>
    );
  }

  return <>{children}</>;
}
