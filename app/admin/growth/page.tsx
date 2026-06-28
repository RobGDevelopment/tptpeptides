import { redirect } from 'next/navigation';
import { GrowthPageContent } from '../../../features/admin/components/GrowthPageContent';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../lib/modules/flags';

export default async function AdminGrowthPage() {
  const flags = await getModuleFlags();
  const growthEnabled =
    isModuleEnabled(flags, 'isAbandonedCartEnabled') ||
    isModuleEnabled(flags, 'isPredictiveReplenishmentEnabled') ||
    isModuleEnabled(flags, 'isLoyaltyRedemptionEnabled');

  if (!growthEnabled) {
    redirect('/admin');
  }

  return <GrowthPageContent />;
}
