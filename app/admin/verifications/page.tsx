import { redirect } from 'next/navigation';
import { VerificationsPageContent } from '../../../features/admin/components/VerificationsPageContent';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';

export default async function AdminVerificationsPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isInstitutionVerificationEnabled')) {
    redirect('/admin');
  }

  return <VerificationsPageContent />;
}
