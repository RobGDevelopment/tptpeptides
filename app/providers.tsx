'use client';

import { useEffect } from 'react';
import { AuthProvider } from '../features/auth/providers/AuthProvider';
import { ClinicAuthProvider } from '../features/auth/providers/ClinicAuthProvider';
import { TenantProvider } from '../lib/tenant/context';
import type { TenantConfig } from '../lib/schemas/tenant';
import { initFirebaseClient } from '../lib/firebase/client';

export function AppProviders({
  children,
  tenantId,
  tenantConfig,
}: {
  children: React.ReactNode;
  tenantId: string;
  tenantConfig: TenantConfig;
}) {
  const lane = tenantConfig.lane;
  const isTelehealth = lane === 'telehealth';

  useEffect(() => {
    if (!isTelehealth) {
      initFirebaseClient();
    }
  }, [isTelehealth]);

  const authTree = isTelehealth ? (
    <ClinicAuthProvider>{children}</ClinicAuthProvider>
  ) : (
    <AuthProvider>{children}</AuthProvider>
  );

  return (
    <TenantProvider tenantId={tenantId} config={tenantConfig}>
      {authTree}
    </TenantProvider>
  );
}
