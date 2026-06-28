'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { ModuleFlags } from '../../../lib/schemas/modules';
import { isRouteAllowedForRole } from '../../../lib/modules/rbac';
import { useAuth } from '../../auth/providers/AuthProvider';
import { isModuleEnabled } from '../../../lib/modules/flags';

export function AdminRbacGate({
  children,
  moduleFlags,
}: {
  children: React.ReactNode;
  moduleFlags: ModuleFlags;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAdmin, loading } = useAuth();
  const rbacEnabled = isModuleEnabled(moduleFlags, 'isGranularRbacEnabled');

  useEffect(() => {
    if (loading || !isAdmin || !role) return;

    if (!isRouteAllowedForRole(pathname, role, rbacEnabled)) {
      router.replace('/admin');
    }
  }, [isAdmin, loading, pathname, rbacEnabled, role, router]);

  return <>{children}</>;
}
