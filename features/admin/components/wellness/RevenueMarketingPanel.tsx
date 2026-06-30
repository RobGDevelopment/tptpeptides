'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  createPromotionCode,
  togglePromotionStatus,
  updatePricingTier,
} from '../../actions/revenueActions';
import type { ClinicPricingTier, ClinicPromotion } from '../../../../lib/schemas/clinicRevenue';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

type RevenueMarketingPanelProps = {
  initialTiers: ClinicPricingTier[];
  initialPromotions: ClinicPromotion[];
};

function formatExpiresAt(value: string | null): string {
  if (!value) return 'No expiry';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatCreatedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function RevenueMarketingPanel({
  initialTiers,
  initialPromotions,
}: RevenueMarketingPanelProps) {
  const [tiers, setTiers] = useState(initialTiers);
  const [promotions, setPromotions] = useState(initialPromotions);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pending, startTransition] = useTransition();

  const [promoCode, setPromoCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('10');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleTierSave = (tier: ClinicPricingTier) => {
    startTransition(async () => {
      const result = await updatePricingTier({
        id: tier.id,
        name: tier.name,
        description: tier.description,
        monthlyPrice: tier.monthlyPrice,
        stripePriceId: tier.stripePriceId,
        isActive: tier.isActive,
        sortOrder: tier.sortOrder,
      });

      if (!result.ok) {
        setToast({ type: 'error', message: result.error });
        return;
      }

      setTiers((current) =>
        current.map((row) => (row.id === result.data.tier.id ? result.data.tier : row))
      );
      setToast({ type: 'success', message: `Updated "${result.data.tier.name}".` });
    });
  };

  const updateTierField = <K extends keyof ClinicPricingTier>(
    tierId: string,
    field: K,
    value: ClinicPricingTier[K]
  ) => {
    setTiers((current) =>
      current.map((tier) => (tier.id === tierId ? { ...tier, [field]: value } : tier))
    );
  };

  const handleCreatePromotion = (event: React.FormEvent) => {
    event.preventDefault();
    setToast(null);

    const parsedDiscount = Number(discountPercentage);
    const parsedMaxUses = maxUses.trim() ? Number(maxUses) : null;

    startTransition(async () => {
      const result = await createPromotionCode({
        code: promoCode,
        discountPercentage: parsedDiscount,
        maxUses: parsedMaxUses,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      if (!result.ok) {
        setToast({ type: 'error', message: result.error });
        return;
      }

      setPromotions((current) => [result.data.promotion, ...current]);
      setPromoCode('');
      setDiscountPercentage('10');
      setMaxUses('');
      setExpiresAt('');
      setToast({ type: 'success', message: `Created promotion "${result.data.promotion.code}".` });
    });
  };

  const handleTogglePromotion = (promotionId: string, nextActive: boolean) => {
    startTransition(async () => {
      const result = await togglePromotionStatus(promotionId, nextActive);

      if (!result.ok) {
        setToast({ type: 'error', message: result.error });
        return;
      }

      setPromotions((current) =>
        current.map((promotion) =>
          promotion.id === promotionId ? { ...promotion, isActive: nextActive } : promotion
        )
      );
      setToast({
        type: 'success',
        message: nextActive ? 'Promotion activated.' : 'Promotion deactivated.',
      });
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

      <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-[10px] tracking-caps uppercase text-muted">Pricing Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Description</th>
                <th>Monthly</th>
                <th>Stripe Price ID</th>
                <th>Sort</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tiers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-10">
                    No pricing tiers configured. Run migration 0005_clinic_revenue_schema.
                  </td>
                </tr>
              ) : (
                tiers.map((tier) => (
                  <tr key={tier.id}>
                    <td>
                      <input
                        className="w-full min-w-[8rem] rounded-sm border border-white/10 bg-void/40 px-2 py-1.5 text-sm text-primary"
                        value={tier.name}
                        onChange={(event) => updateTierField(tier.id, 'name', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="w-full min-w-[12rem] rounded-sm border border-white/10 bg-void/40 px-2 py-1.5 text-sm text-secondary"
                        value={tier.description ?? ''}
                        onChange={(event) =>
                          updateTierField(tier.id, 'description', event.target.value || null)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="w-24 rounded-sm border border-white/10 bg-void/40 px-2 py-1.5 text-sm text-primary"
                        value={tier.monthlyPrice}
                        onChange={(event) =>
                          updateTierField(tier.id, 'monthlyPrice', Number(event.target.value))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="w-full min-w-[10rem] rounded-sm border border-white/10 bg-void/40 px-2 py-1.5 text-xs font-mono text-muted"
                        value={tier.stripePriceId ?? ''}
                        placeholder="price_…"
                        onChange={(event) =>
                          updateTierField(tier.id, 'stripePriceId', event.target.value || null)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className="w-16 rounded-sm border border-white/10 bg-void/40 px-2 py-1.5 text-sm text-primary"
                        value={tier.sortOrder}
                        onChange={(event) =>
                          updateTierField(tier.id, 'sortOrder', Number(event.target.value))
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={tier.isActive}
                        onChange={(event) =>
                          updateTierField(tier.id, 'isActive', event.target.checked)
                        }
                        aria-label={`Toggle ${tier.name} active`}
                      />
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => handleTierSave(tier)}
                      >
                        Save
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-[10px] tracking-caps uppercase text-muted">Promotions Engine</h2>
        </div>
        <div className="p-5 space-y-5">
          <form onSubmit={handleCreatePromotion} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Coupon code"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              placeholder="EXEC2026"
              autoComplete="off"
              required
            />
            <Input
              label="Discount (%)"
              type="number"
              min={1}
              max={100}
              value={discountPercentage}
              onChange={(event) => setDiscountPercentage(event.target.value)}
              required
            />
            <Input
              label="Max uses (optional)"
              type="number"
              min={1}
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              placeholder="Unlimited"
            />
            <Input
              label="Expires at (optional)"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>
                Generate coupon code
              </Button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Usage</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {promotions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-10">
                      No promotional codes yet.
                    </td>
                  </tr>
                ) : (
                  promotions.map((promotion) => (
                    <tr key={promotion.id}>
                      <td className="font-mono text-sm text-primary">{promotion.code}</td>
                      <td className="text-secondary">{promotion.discountPercentage}%</td>
                      <td className="text-secondary">
                        {promotion.currentUses}
                        {promotion.maxUses ? ` / ${promotion.maxUses}` : ' / ∞'}
                      </td>
                      <td className="text-muted text-xs">{formatExpiresAt(promotion.expiresAt)}</td>
                      <td>
                        <span
                          className={`text-xs tracking-caps uppercase ${
                            promotion.isActive ? 'text-gold-light' : 'text-muted'
                          }`}
                        >
                          {promotion.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-muted text-xs">{formatCreatedAt(promotion.createdAt)}</td>
                      <td>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={pending}
                          onClick={() =>
                            handleTogglePromotion(promotion.id, !promotion.isActive)
                          }
                        >
                          {promotion.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RevenueMetricsSnapshot({
  metrics,
}: {
  metrics: {
    activeSubscriptions: number;
    trialingSubscriptions: number;
    estimatedMrr: number;
    activePromotions: number;
    totalPromotionRedemptions: number;
  };
}) {
  const cards = [
    { label: 'Active subscriptions', value: String(metrics.activeSubscriptions) },
    { label: 'Trialing', value: String(metrics.trialingSubscriptions) },
    { label: 'Estimated MRR', value: currency.format(metrics.estimatedMrr) },
    { label: 'Active promotions', value: String(metrics.activePromotions) },
    {
      label: 'Promotion redemptions',
      value: String(metrics.totalPromotionRedemptions),
    },
  ];

  return (
    <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-3">
        <h2 className="text-[10px] tracking-caps uppercase text-muted">
          Proforma / Revenue Snapshot
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-white/[0.06]">
        {cards.map((card) => (
          <div key={card.label} className="bg-surface/20 px-5 py-6">
            <p className="text-[10px] tracking-caps uppercase text-muted mb-2">{card.label}</p>
            <p className="text-2xl font-light tracking-title text-primary">{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
