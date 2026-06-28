import { OrdersPageContent } from '../../../features/admin/components/OrdersPageContent';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { showAccountingExportPanel } from '../../../lib/modules/adminModuleLinks';
import { isModuleEnabled } from '../../../lib/modules/flags';

export default async function AdminOrdersPage() {
  const flags = await getModuleFlags();

  return (
    <OrdersPageContent
      showAccountingExport={showAccountingExportPanel(flags)}
      showBatchCoa={isModuleEnabled(flags, 'isBatchCoaEnabled')}
      showRealShipping={isModuleEnabled(flags, 'isRealShippingEnabled')}
    />
  );
}
