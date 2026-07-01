import { redirect } from 'next/navigation';
import {
  getPricingTiers,
  getPromotions,
  getRevenueMetrics,
  getTelehealthBillingStrategy,
} from '../../../../features/admin/actions/revenueActions';
import { getClinicFinanceMetrics } from '../../../../features/admin/actions/financeActions';
import { BillingStrategyPanel } from '../../../../features/admin/components/wellness/BillingStrategyPanel';
import { ClinicFinancePanel } from '../../../../features/admin/components/wellness/ClinicFinancePanel';
import {
  RevenueMarketingPanel,
  RevenueMetricsSnapshot,
} from '../../../../features/admin/components/wellness/RevenueMarketingPanel';
import { AdminPageHeader } from '../../../../components/ui/AdminPageHeader';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export default async function AdminWellnessMarketingPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    redirect('/admin');
  }

  let tiers: Awaited<ReturnType<typeof getPricingTiers>> = [];
  let promotions: Awaited<ReturnType<typeof getPromotions>> = [];
  let metrics: Awaited<ReturnType<typeof getRevenueMetrics>> | null = null;
  let billingStrategy: Awaited<ReturnType<typeof getTelehealthBillingStrategy>> =
    'upfront_capture';
  let financeMetrics: Awaited<ReturnType<typeof getClinicFinanceMetrics>> | null = null;
  let loadError: string | null = null;

  try {
    [tiers, promotions, metrics, billingStrategy, financeMetrics] = await Promise.all([
      getPricingTiers(),
      getPromotions(),
      getRevenueMetrics(),
      getTelehealthBillingStrategy(),
      getClinicFinanceMetrics(),
    ]);
  } catch (caught) {
    loadError = caught instanceof Error ? caught.message : 'Unable to load revenue dashboard.';
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Marketing & Revenue"
        subtitle="Billing compliance, gateway-agnostic pricing tiers, promotions, and proforma subscription metrics."
      />

      {loadError ? (
        <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {loadError}
        </div>
      ) : null}

      <BillingStrategyPanel initialStrategy={billingStrategy} />

      {financeMetrics ? <ClinicFinancePanel metrics={financeMetrics} /> : null}

      {metrics ? <RevenueMetricsSnapshot metrics={metrics} /> : null}

      <RevenueMarketingPanel initialTiers={tiers} initialPromotions={promotions} />
    </div>
  );
}
