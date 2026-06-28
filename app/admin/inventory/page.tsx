import { InventoryPageContent } from '../../../features/admin/components/InventoryPageContent';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';

export default async function AdminInventoryPage() {
  const flags = await getModuleFlags();

  return (
    <InventoryPageContent
      showBatchCoa={isModuleEnabled(flags, 'isBatchCoaEnabled')}
      showGeoCompliance={isModuleEnabled(flags, 'isComplianceGeoBlockEnabled')}
    />
  );
}
