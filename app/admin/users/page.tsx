import { redirect } from 'next/navigation';
import { UsersPageContent } from '../../../features/admin/components/UsersPageContent';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';

export default async function AdminUsersPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isUserManagementEnabled')) {
    redirect('/admin');
  }

  return <UsersPageContent />;
}
