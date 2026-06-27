import type { Metadata, Viewport } from 'next';
import { AdminGuard } from '../../features/admin/components/AdminGuard';
import { AdminShell } from '../../features/admin/components/AdminShell';
import { OWNER_APP } from '../../lib/app/profiles';

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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
