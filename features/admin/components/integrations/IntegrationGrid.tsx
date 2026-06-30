'use client';

import { Button } from '../../../../components/ui/Button';
import type { PlatformIntegrationListItem } from '../../../../lib/schemas/platformIntegrations';
import { CATEGORY_LABELS, MODE_LABELS } from '../../../../lib/integrations/fieldLabels';

type IntegrationGridProps = {
  items: PlatformIntegrationListItem[];
  onConfigure: (slug: PlatformIntegrationListItem['slug']) => void;
  pending?: boolean;
};

const CATEGORY_ORDER = [
  'fulfillment',
  'financial',
  'crm_comms',
  'compliance',
  'ops',
] as const;

function modeBadgeClass(mode: PlatformIntegrationListItem['mode']): string {
  switch (mode) {
    case 'live':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'sandbox':
      return 'border-gold-light/30 bg-gold-light/10 text-gold-light';
    default:
      return 'border-white/10 bg-white/[0.03] text-muted';
  }
}

export function IntegrationGrid({ items, onConfigure, pending }: IntegrationGridProps) {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8">
      {grouped.map((group) => (
        <section key={group.category}>
          <h2 className="text-[10px] tracking-caps uppercase text-muted mb-4">{group.label}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.items.map((item) => (
              <article
                key={item.slug}
                className="rounded-sm border border-white/[0.06] bg-surface/20 p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm text-primary font-light">{item.label}</h3>
                    {item.availability === 'coming_soon' ? (
                      <p className="mt-1 text-[10px] tracking-caps uppercase text-muted">
                        Coming soon
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] tracking-caps uppercase ${modeBadgeClass(item.mode)}`}
                  >
                    {MODE_LABELS[item.mode]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] tracking-caps uppercase text-muted">
                  {item.hasSandboxSecrets ? (
                    <span className="rounded-sm border border-white/10 px-2 py-0.5">Sandbox keys</span>
                  ) : null}
                  {item.hasLiveSecrets ? (
                    <span className="rounded-sm border border-white/10 px-2 py-0.5">Live keys</span>
                  ) : null}
                  {item.lastTestStatus === 'success' ? (
                    <span className="rounded-sm border border-emerald-500/20 px-2 py-0.5 text-emerald-300">
                      Tested OK
                    </span>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending || item.availability === 'coming_soon'}
                  onClick={() => onConfigure(item.slug)}
                >
                  Configure
                </Button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
