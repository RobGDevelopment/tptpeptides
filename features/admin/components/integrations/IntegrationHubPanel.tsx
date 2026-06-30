'use client';

import { useEffect, useState, useTransition } from 'react';
import { listIntegrations } from '../../actions/integrationActions';
import { IntegrationDetailDrawer } from './IntegrationDetailDrawer';
import { IntegrationGrid } from './IntegrationGrid';
import type { PlatformIntegrationListItem } from '../../../../lib/schemas/platformIntegrations';
import type { IntegrationSlug } from '../../../../lib/integrations/types';

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

type IntegrationHubPanelProps = {
  initialItems: PlatformIntegrationListItem[];
};

export function IntegrationHubPanel({ initialItems }: IntegrationHubPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [activeSlug, setActiveSlug] = useState<IntegrationSlug | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const refreshList = () => {
    startTransition(async () => {
      try {
        const next = await listIntegrations();
        setItems(next);
      } catch {
        // Keep existing list if refresh fails silently
      }
    });
  };

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          role="status"
          className={`rounded-sm border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border-gold-light/30 bg-gold-light/5 text-gold-light'
              : 'border-red-500/30 bg-red-500/5 text-red-300'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <IntegrationGrid
        items={items}
        pending={pending}
        onConfigure={(slug) => setActiveSlug(slug)}
      />

      <IntegrationDetailDrawer
        slug={activeSlug}
        onClose={() => setActiveSlug(null)}
        onUpdated={refreshList}
        onToast={setToast}
      />
    </div>
  );
}
