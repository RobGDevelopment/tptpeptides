'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClinicAuth } from '../../auth/providers/ClinicAuthProvider';
import { ClinicAuthForm, ClinicAuthLoading } from './ClinicAuthForm';

export function ClinicDashboardGate() {
  const { user, loading } = useClinicAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.refresh();
    }
  }, [loading, user, router]);

  if (loading || user) {
    return <ClinicAuthLoading />;
  }

  return (
    <ClinicAuthForm
      title="My Care"
      subtitle="Sign in to view your intake status, profile, and active prescriptions."
    />
  );
}
