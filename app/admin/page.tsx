import { AdminDashboard } from '../../features/admin/components/AdminDashboard';
import { getModuleFlags } from '../../lib/firebase/modules.server';
import { getAdminModuleLinks } from '../../lib/modules/adminModuleLinks';

export default async function AdminPage() {
  const flags = await getModuleFlags();
  const enabledModules = getAdminModuleLinks(flags);

  return <AdminDashboard enabledModules={enabledModules} />;
}
