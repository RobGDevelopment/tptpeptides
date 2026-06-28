'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { DEFAULT_TIER_DISCOUNTS } from '../../../lib/data/priceListDefaults';
import type { PriceListDoc } from '../../../lib/schemas/priceList';
import type { InstitutionTier } from '../../../lib/schemas/user';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Spinner } from '../../../components/ui/Spinner';

const TIERS: InstitutionTier[] = ['Bronze', 'Silver', 'Gold'];

export function TierPricingPanel() {
  const [priceLists, setPriceLists] = useState<PriceListDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTier, setSavingTier] = useState<InstitutionTier | null>(null);
  const [message, setMessage] = useState('');
  const [disabled, setDisabled] = useState(false);

  const loadPriceLists = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await adminFetch('/api/admin/price-lists');
      if (response.status === 404) {
        setDisabled(true);
        setPriceLists(
          TIERS.map((tier) => ({
            tier,
            discountPercent: DEFAULT_TIER_DISCOUNTS[tier],
            productOverrides: {},
          }))
        );
        return;
      }

      const data = (await response.json()) as { priceLists?: PriceListDoc[]; error?: string };
      if (!response.ok) {
        setMessage(data.error ?? 'Unable to load tier pricing');
        return;
      }

      setPriceLists(data.priceLists ?? []);
      setDisabled(false);
    } catch {
      setMessage('Unable to load tier pricing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPriceLists();
  }, [loadPriceLists]);

  const updateDiscount = (tier: InstitutionTier, discountPercent: number) => {
    setPriceLists((current) =>
      current.map((list) => (list.tier === tier ? { ...list, discountPercent } : list))
    );
  };

  const saveTier = async (tier: InstitutionTier) => {
    const list = priceLists.find((row) => row.tier === tier);
    if (!list) return;

    setSavingTier(tier);
    setMessage('');
    try {
      const response = await adminFetch('/api/admin/price-lists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          discountPercent: list.discountPercent,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? `Failed to save ${tier} pricing`);
        return;
      }
      setMessage(`${tier} tier pricing saved`);
      await loadPriceLists();
    } catch {
      setMessage(`Failed to save ${tier} pricing`);
    } finally {
      setSavingTier(null);
    }
  };

  if (loading) {
    return <Spinner label="Loading tier pricing..." className="py-10" />;
  }

  return (
    <div id="tier-pricing" className="space-y-6 scroll-mt-8">
      <HeaderDividerBeam delay={2} />
      <div>
        <h2 className="admin-heading text-xl">Institution Tier Pricing</h2>
        <p className="admin-subheading">
          Catalog discount applied at checkout for verified institutions when B2B procurement and
          tiered pricing modules are enabled.
        </p>
      </div>

      {disabled && (
        <p className="admin-banner">
          Enable <span className="text-primary">B2B Procurement Suite</span> and{' '}
          <span className="text-primary">Tiered Pricing</span> in Module Control Center to activate
          live pricing rules.
        </p>
      )}

      {message && <p className="admin-banner">{message}</p>}

      <div className="admin-table-section">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Catalog Discount</th>
                <th>Example ($100 SKU)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {priceLists.map((list) => {
                const example = Math.round(100 * (1 - list.discountPercent) * 100) / 100;
                return (
                  <tr key={list.tier}>
                    <td className="text-gold-light">{list.tier}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={50}
                          step={1}
                          value={Math.round(list.discountPercent * 100)}
                          onChange={(event) =>
                            updateDiscount(list.tier, Number(event.target.value) / 100)
                          }
                          disabled={disabled || savingTier != null}
                          className="accent-gold w-32"
                        />
                        <span className="text-sm text-secondary tabular-nums">
                          {Math.round(list.discountPercent * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="metallic-gold">${example.toFixed(2)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        disabled={disabled || savingTier != null}
                        onClick={() => void saveTier(list.tier)}
                      >
                        {savingTier === list.tier ? 'Saving...' : 'Save'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
