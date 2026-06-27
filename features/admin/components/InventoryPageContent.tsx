'use client';

import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../../../lib/firebase/firestore';
import type { LowStockVariant } from '../types';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';

const DEFAULT_THRESHOLD = 20;

export function InventoryPageContent() {
  const [variants, setVariants] = useState<LowStockVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drafting, setDrafting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const productsQuery = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const lowStock = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const stock = Number(data.stock ?? 0);
          const threshold = Number(data.reorderThreshold ?? DEFAULT_THRESHOLD);
          return {
            id: doc.id,
            catalogId: String(data.catalogId ?? doc.id),
            name: String(data.name ?? 'Unknown'),
            tag: String(data.tag ?? '—'),
            stock,
            reorderThreshold: threshold,
            baseCost: data.baseCost != null ? Number(data.baseCost) : null,
            price: Number(data.price ?? 0),
          };
        })
        .filter((variant) => variant.stock <= variant.reorderThreshold);

      setVariants(lowStock);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const totalDraftCost = useMemo(() => {
    return variants
      .filter((variant) => selected.has(variant.id))
      .reduce((sum, variant) => {
        const reorderQty = Math.max(variant.reorderThreshold * 2 - variant.stock, 10);
        return sum + (variant.baseCost ?? 0) * reorderQty;
      }, 0);
  }, [variants, selected]);

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const draftPurchaseOrder = async () => {
    if (selected.size === 0) return;
    setDrafting(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantIds: [...selected] }),
      });
      const data = (await response.json()) as { poId?: string; totalBaseCost?: number; error?: string };
      if (!response.ok) {
        setMessage(data.error ?? 'Failed to draft PO');
        return;
      }
      setMessage(`PO ${data.poId} drafted — est. base cost $${data.totalBaseCost?.toFixed(2)}`);
      setSelected(new Set());
    } catch {
      setMessage('Failed to draft purchase order');
    } finally {
      setDrafting(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading inventory..." className="py-20" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventory & Purchase Orders"
        subtitle={`Flagged variants at or below reorder threshold (${DEFAULT_THRESHOLD} units default)`}
        beamDelay={1}
        actions={
          <Button onClick={draftPurchaseOrder} disabled={drafting || selected.size === 0}>
            {drafting ? 'Drafting PO...' : `Draft PO (${selected.size})`}
          </Button>
        }
      />

      {message && <p className="admin-banner">{message}</p>}

      {selected.size > 0 && (
        <p className="text-sm text-secondary font-light border-b border-white/[0.06] pb-4">
          Estimated PO base cost for selected SKUs:{' '}
          <span className="metallic-gold font-medium">${totalDraftCost.toFixed(2)}</span>
        </p>
      )}

      <div className="admin-table-section">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>Product</th>
                <th>Variant</th>
                <th>Stock</th>
                <th>Threshold</th>
                <th>Base Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {variants.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    All variants are above reorder thresholds.
                  </td>
                </tr>
              )}
              {variants.map((variant) => (
                <tr key={variant.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(variant.id)}
                      onChange={() => toggleSelect(variant.id)}
                      className="accent-gold"
                    />
                  </td>
                  <td className="text-primary">{variant.name}</td>
                  <td className="text-muted">{variant.tag}</td>
                  <td className="text-gold-light">{variant.stock}</td>
                  <td>{variant.reorderThreshold}</td>
                  <td>{variant.baseCost != null ? `$${variant.baseCost.toFixed(2)}` : '—'}</td>
                  <td>
                    <span className="text-[10px] tracking-caps uppercase text-muted">Low Stock</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
