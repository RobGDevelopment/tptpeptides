import type { Metadata, Viewport } from 'next';
import { AdminGuard } from '../../features/admin/components/AdminGuard';
import { AdminRbacGate } from '../../features/admin/components/AdminRbacGate';
import { AdminShell } from '../../features/admin/components/AdminShell';
import { OWNER_APP } from '../../lib/app/profiles';
import { getModuleFlags } from '../../lib/firebase/modules.server';

export const metadata: Metadata = {
  title: {
    default: OWNER_APP.shortName,
    template: `%s | ${OWNER_APP.shortName}`,
  },
  description: OWNER_APP.description,
  applicationName: OWNER_APP.shortName,
  manifest: OWNER_APP.manifestPath,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: OWNER_APP.shortName,
  },
  robots: {
    index: false,
    follow: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: OWNER_APP.themeColor,
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const moduleFlags = await getModuleFlags();

  return (
    <AdminGuard>
      <AdminRbacGate moduleFlags={moduleFlags}>
        <AdminShell moduleFlags={moduleFlags}>{children}</AdminShell>
      </AdminRbacGate>
    </AdminGuard>
  );
}
