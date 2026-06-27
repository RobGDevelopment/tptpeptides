import { AdminGuard } from '../../features/admin/components/AdminGuard';
import { AdminShell } from '../../features/admin/components/AdminShell';

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