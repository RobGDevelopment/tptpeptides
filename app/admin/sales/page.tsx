import { redirect } from 'next/navigation';
import { SalesPageContent } from '../../../features/admin/components/SalesPageContent';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';

export default async function AdminSalesPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isSalesCommandCenterEnabled')) {
    redirect('/admin');
  }

  return (
    <SalesPageContent
      showMarginReporting={isModuleEnabled(flags, 'isMarginReportingEnabled')}
      showLeadRouting={isModuleEnabled(flags, 'isLeadRoutingEnabled')}
      showImpersonation={isModuleEnabled(flags, 'isClientImpersonationEnabled')}
    />
  );
}
