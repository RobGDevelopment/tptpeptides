'use client';

import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { db } from '../../../lib/firebase/firestore';
import type { LowStockVariant } from '../types';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Spinner } from '../../../components/ui/Spinner';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { BatchesPanel } from './BatchesPanel';
import { GeoCompliancePanel } from './GeoCompliancePanel';

const DEFAULT_THRESHOLD = 20;

interface PurchaseOrderItem {
  id: string;
  name: string;
  tag: string;
  stock: number;
  baseCost: number | null;
}

interface PurchaseOrderRow {
  id: string;
  supplierId: string;
  items: PurchaseOrderItem[];
  totalBaseCost: number;
  status: string;
  generatedAt: string | null;
  approvedAt: string | null;
}

function formatPoDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function InventoryPageContent({
  showBatchCoa,
  showGeoCompliance,
}: {
  showBatchCoa: boolean;
  showGeoCompliance: boolean;
}) {
  const [variants, setVariants] = useState<LowStockVariant[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [poLoading, setPoLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drafting, setDrafting] = useState(false);
  const [poActionId, setPoActionId] = useState<string | null>(null);
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

  useEffect(() => {
    const poQuery = query(collection(db, 'purchaseOrders'), orderBy('generatedAt', 'desc'));
    const unsubscribe = onSnapshot(poQuery, (snapshot) => {
      setPurchaseOrders(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            supplierId: String(data.supplierId ?? 'default-supplier'),
            items: (data.items as PurchaseOrderItem[]) ?? [],
            totalBaseCost: Number(data.totalBaseCost ?? 0),
            status: String(data.status ?? 'pending_supplier_review'),
            generatedAt: data.generatedAt?.toDate?.()?.toISOString?.() ?? null,
            approvedAt: data.approvedAt?.toDate?.()?.toISOString?.() ?? null,
          };
        })
      );
      setPoLoading(false);
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
      const response = await adminFetch('/api/admin/purchase-orders', {
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

  const runPoAction = async (poId: string, action: 'approve' | 'export') => {
    setPoActionId(`${poId}:${action}`);
    setMessage('');
    try {
      const response = await adminFetch('/api/admin/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId, action }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        exportCsv?: string;
        error?: string;
      };

      if (!response.ok) {
        setMessage(data.error ?? `Failed to ${action} PO`);
        return;
      }

      if (action === 'approve') {
        setMessage(`PO ${poId} approved`);
      }

      if (action === 'export' && data.exportCsv) {
        const blob = new Blob([data.exportCsv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `po-${poId}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        setMessage(`PO ${poId} exported`);
      }
    } catch {
      setMessage(`Failed to ${action} purchase order`);
    } finally {
      setPoActionId(null);
    }
  };

  if (loading) {
    return <Spinner label="Loading inventory..." className="py-20" />;
  }

  return (
    <div className="space-y-10">
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

      <HeaderDividerBeam delay={2} />

      <div className="space-y-4">
        <div>
          <h2 className="admin-heading text-xl">Purchase Orders</h2>
          <p className="admin-subheading">Approve supplier POs and export line items for procurement.</p>
        </div>

        {poLoading ? (
          <Spinner label="Loading purchase orders..." className="py-10" />
        ) : (
          <div className="admin-table-section">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>PO ID</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Est. Base Cost</th>
                    <th>Created</th>
                    <th>Approved</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted">
                        No purchase orders yet. Draft one from low-stock variants above.
                      </td>
                    </tr>
                  )}
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="font-mono text-xs text-primary">{po.id.slice(0, 10)}…</td>
                      <td className="text-[10px] tracking-caps uppercase text-gold-light">
                        {statusLabel(po.status)}
                      </td>
                      <td>{po.items.length}</td>
                      <td className="metallic-gold">${po.totalBaseCost.toFixed(2)}</td>
                      <td className="text-muted text-xs">{formatPoDate(po.generatedAt)}</td>
                      <td className="text-muted text-xs">{formatPoDate(po.approvedAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {po.status !== 'approved' && po.status !== 'fulfilled' && (
                            <Button
                              variant="ghost"
                              disabled={poActionId != null}
                              onClick={() => void runPoAction(po.id, 'approve')}
                            >
                              {poActionId === `${po.id}:approve` ? 'Approving...' : 'Approve'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            disabled={poActionId != null}
                            onClick={() => void runPoAction(po.id, 'export')}
                          >
                            {poActionId === `${po.id}:export` ? 'Exporting...' : 'Export CSV'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showBatchCoa && (
        <div id="batch-coa">
          <HeaderDividerBeam delay={3} />
          <BatchesPanel />
        </div>
      )}

      {showGeoCompliance && (
        <div id="geo-compliance">
          <HeaderDividerBeam delay={3} />
          <GeoCompliancePanel />
        </div>
      )}
    </div>
  );
}
