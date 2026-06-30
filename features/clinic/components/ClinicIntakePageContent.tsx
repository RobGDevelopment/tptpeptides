'use client';

import { useClinicAuth } from '../../auth/providers/ClinicAuthProvider';
import { ClinicAuthForm, ClinicAuthLoading } from './ClinicAuthForm';
import { MedicalIntakeWizard } from './MedicalIntakeWizard';

export function ClinicIntakePageContent() {
  const { user, loading } = useClinicAuth();

  if (loading) {
    return <ClinicAuthLoading />;
  }

  if (!user) {
    return <ClinicAuthForm />;
  }

  return <MedicalIntakeWizard userId={user.id} />;
}
