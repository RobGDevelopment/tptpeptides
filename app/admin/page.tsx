import { AdminDashboard } from '../../features/admin/components/AdminDashboard';
import { getModuleFlags } from '../../lib/firebase/modules.server';
import { getAdminModuleLinks } from '../../lib/modules/adminModuleLinks';
import { getLiveSitesSnapshot } from '../../lib/tenant/liveSites.server';

export default async function AdminPage() {
  const flags = await getModuleFlags();
  const enabledModules = getAdminModuleLinks(flags);
  const liveSites = await getLiveSitesSnapshot();

  return <AdminDashboard enabledModules={enabledModules} liveSites={liveSites} />;
}
