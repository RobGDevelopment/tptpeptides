'use client';

import { useEffect } from 'react';
import { AuthProvider } from '../features/auth/providers/AuthProvider';
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
  useEffect(() => {
    initFirebaseClient();
  }, []);

  return (
    <TenantProvider tenantId={tenantId} config={tenantConfig}>
      <AuthProvider>{children}</AuthProvider>
    </TenantProvider>
  );
}