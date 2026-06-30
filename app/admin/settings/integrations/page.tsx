import { redirect } from 'next/navigation';
import { listIntegrations } from '../../../../features/admin/actions/integrationActions';
import { IntegrationHubPanel } from '../../../../features/admin/components/integrations/IntegrationHubPanel';
import { AdminPageHeader } from '../../../../components/ui/AdminPageHeader';
import { isIntegrationsMasterKeyConfigured } from '../../../../lib/integrations/crypto.server';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

export default async function AdminIntegrationsPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    redirect('/admin');
  }

  let items: Awaited<ReturnType<typeof listIntegrations>> = [];
  let loadError: string | null = null;

  try {
    items = await listIntegrations();
  } catch (caught) {
    loadError = caught instanceof Error ? caught.message : 'Unable to load integrations.';
  }

  const masterKeyReady = isIntegrationsMasterKeyConfigured();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Integration Hub"
        subtitle="Monorepo-wide credentials for fulfillment, payments, CRM, compliance, and ops — encrypted at rest."
      />

      {!masterKeyReady ? (
        <div className="rounded-sm border border-gold-light/30 bg-gold-light/5 p-4 text-sm text-gold-light">
          Set <code className="text-primary">INTEGRATIONS_MASTER_KEY</code> in the server environment
          before saving credentials. Generate with:{' '}
          <code className="text-primary">openssl rand -base64 32</code>
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {loadError}
        </div>
      ) : null}

      <IntegrationHubPanel initialItems={items} />
    </div>
  );
}
