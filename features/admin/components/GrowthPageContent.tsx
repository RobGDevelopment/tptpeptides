'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Spinner } from '../../../components/ui/Spinner';
import type { ReplenishmentCandidate } from '../../../lib/schemas/growth';

interface AbandonedCartRow {
  id: string;
  email: string;
  subtotal: number;
  updatedAt: string;
  items: Array<{ name: string; quantity: number }>;
}

interface GrowthData {
  flags: {
    abandonedCart: boolean;
    replenishment: boolean;
    loyaltyRedemption: boolean;
    transactionalEmail: boolean;
  };
  activeCarts: number;
  abandonedReady: AbandonedCartRow[];
  replenishmentCandidates: ReplenishmentCandidate[];
}

export function GrowthPageContent() {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    const response = await adminFetch('/api/admin/growth');
    if (response.status === 404) {
      window.location.href = '/admin';
      return;
    }
    if (!response.ok) {
      setError('Unable to load growth workspace.');
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as GrowthData;
    setData(payload);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runJob = async (job: 'abandoned-carts' | 'replenishment') => {
    setMessage('');
    setRunningJob(job);
    try {
      const response = await adminFetch('/api/admin/growth/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      });
      const payload = (await response.json()) as { error?: string; sent?: number; processed?: number };
      if (!response.ok) {
        setError(payload.error ?? 'Job failed.');
        return;
      }
      setMessage(
        job === 'abandoned-carts'
          ? `Abandoned cart emails processed (${payload.sent ?? payload.processed ?? 0} sent).`
          : `Replenishment emails processed (${payload.sent ?? payload.processed ?? 0} sent).`
      );
      await load();
    } finally {
      setRunningJob(null);
    }
  };

  if (loading) {
    return <Spinner label="Loading growth workspace..." className="py-20" />;
  }

  if (error && !data) {
    return <p className="text-red-400/90 text-sm">{error}</p>;
  }

  if (!data) return null;

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Growth Command Center"
        subtitle="Abandoned cart recovery, predictive replenishment, and loyalty redemption."
      />

      {message && <p className="text-sm text-gold-light font-light">{message}</p>}
      {error && <p className="text-sm text-red-400/90">{error}</p>}

      <section className="grid md:grid-cols-3 gap-6">
        <MetricCard label="Active cart snapshots" value={String(data.activeCarts)} />
        <MetricCard
          label="Abandoned carts ready"
          value={String(data.abandonedReady.length)}
          hidden={!data.flags.abandonedCart}
        />
        <MetricCard
          label="Replenishment candidates"
          value={String(data.replenishmentCandidates.length)}
          hidden={!data.flags.replenishment}
        />
      </section>

      {data.flags.abandonedCart && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[10px] tracking-caps uppercase text-muted">Abandoned cart recovery</h2>
            <Button
              type="button"
              disabled={runningJob !== null}
              onClick={() => void runJob('abandoned-carts')}
              className="text-xs"
            >
              {runningJob === 'abandoned-carts' ? 'Running…' : 'Run abandoned cart job'}
            </Button>
          </div>
          <div className="border border-white/[0.06] rounded-sm overflow-hidden">
            {data.abandonedReady.length === 0 ? (
              <p className="p-6 text-sm text-muted font-light">No idle carts awaiting recovery email.</p>
            ) : (
              data.abandonedReady.map((row, index) => (
                <div key={row.id} className="p-4">
                  {index > 0 ? <HeaderDividerBeam contained animated={false} className="mb-4" /> : null}
                  <div className="flex justify-between gap-4 text-sm">
                    <div>
                      <p className="text-primary font-light">{row.email}</p>
                      <p className="text-xs text-muted mt-1">
                        {row.items.map((item) => `${item.name} ×${item.quantity}`).join(' · ')}
                      </p>
                    </div>
                    <div className="text-right text-muted">
                      <p>${row.subtotal.toFixed(2)}</p>
                      <p className="text-[10px] tracking-caps uppercase mt-1">
                        {new Date(row.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {data.flags.replenishment && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[10px] tracking-caps uppercase text-muted">Predictive replenishment</h2>
            <Button
              type="button"
              disabled={runningJob !== null}
              onClick={() => void runJob('replenishment')}
              className="text-xs"
            >
              {runningJob === 'replenishment' ? 'Running…' : 'Run replenishment job'}
            </Button>
          </div>
          <div className="border border-white/[0.06] rounded-sm overflow-hidden">
            {data.replenishmentCandidates.length === 0 ? (
              <p className="p-6 text-sm text-muted font-light">No replenishment candidates in the 80–100 day window.</p>
            ) : (
              data.replenishmentCandidates.map((row, index) => (
                <div key={`${row.userId}-${row.productId}`} className="p-4">
                  {index > 0 ? <HeaderDividerBeam contained animated={false} className="mb-4" /> : null}
                  <div className="flex justify-between gap-4 text-sm">
                    <div>
                      <p className="text-primary font-light">{row.email}</p>
                      <p className="text-xs text-muted mt-1">
                        {row.productName} ({row.productTag}) · suggest ×{row.suggestedQuantity}
                      </p>
                    </div>
                    <p className="text-muted text-[10px] tracking-caps uppercase">
                      {row.daysSinceOrder} days since last order
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {data.flags.loyaltyRedemption && (
        <section className="border border-white/[0.06] rounded-sm p-6 space-y-2">
          <h2 className="text-[10px] tracking-caps uppercase text-muted">Loyalty redemption</h2>
          <p className="text-sm text-secondary font-light">
            Signed-in buyers can redeem points in 10-point increments at checkout (100 points = $1 catalog
            discount). Points are netted against earned rewards when payment completes.
          </p>
        </section>
      )}

      {!data.flags.transactionalEmail && (data.flags.abandonedCart || data.flags.replenishment) && (
        <p className="text-xs text-amber-400/90 font-light">
          Transactional email is disabled — recovery jobs will skip sending until Resend is configured and the
          module is enabled.
        </p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hidden,
}: {
  label: string;
  value: string;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <div className="border border-white/[0.06] rounded-sm p-6">
      <p className="text-[10px] tracking-caps uppercase text-muted mb-2">{label}</p>
      <p className="text-2xl text-primary font-light">{value}</p>
    </div>
  );
}
