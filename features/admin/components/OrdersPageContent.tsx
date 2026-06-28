'use client';

import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { Button } from '../../../components/ui/Button';
import { db } from '../../../lib/firebase/firestore';
import type { AdminOrderRow, OrderStatus } from '../types';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '../types';
import { Spinner } from '../../../components/ui/Spinner';
import { AccountingExportPanel } from './AccountingExportPanel';

function parseTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

const ALL_STATUSES: OrderStatus[] = [
  'pending_payment',
  'pending_invoice',
  'paid',
  'processing',
  'fulfilled',
  'cancelled',
];

export function OrdersPageContent({
  showAccountingExport,
  showBatchCoa,
  showRealShipping,
}: {
  showAccountingExport: boolean;
  showBatchCoa: boolean;
  showRealShipping: boolean;
}) {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: (data.userId as string | null) ?? null,
            guestEmail: (data.guestEmail as string | null | undefined) ?? null,
            total: Number(data.total ?? 0),
            status: (data.status as OrderStatus) ?? 'pending_payment',
            items: (data.items as { name: string; quantity: number }[]) ?? [],
            createdAt: parseTimestamp(data.createdAt),
            trackingNumber: (data.trackingNumber as string | null | undefined) ?? null,
            carrier: (data.carrier as string | null | undefined) ?? null,
          };
        })
      );
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await adminFetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const assignBatches = async (orderId: string) => {
    setUpdatingId(orderId);
    setActionMessage('');
    const response = await adminFetch(`/api/admin/orders/${orderId}/assign-batches`, { method: 'POST' });
    setUpdatingId(null);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setActionMessage(data.error ?? 'Batch assignment failed');
      return;
    }
    setActionMessage(`Batches assigned for order ${orderId.slice(-8).toUpperCase()}`);
  };

  const createLabel = async (orderId: string) => {
    setUpdatingId(orderId);
    setActionMessage('');
    const response = await adminFetch(`/api/admin/orders/${orderId}/ship`, { method: 'POST' });
    setUpdatingId(null);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setActionMessage(data.error ?? 'Label creation failed');
      return;
    }
    const data = (await response.json()) as { trackingNumber?: string; carrier?: string };
    setActionMessage(
      `Label created — ${data.carrier ?? 'Carrier'} tracking ${data.trackingNumber ?? 'pending'}`
    );
  };

  if (loading) {
    return <Spinner label="Loading orders..." className="py-20" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Order Workflow"
        subtitle="Track and advance customer requisitions through fulfillment"
        beamDelay={3}
      />

      {showAccountingExport ? <AccountingExportPanel /> : null}
      {actionMessage && <p className="admin-banner">{actionMessage}</p>}

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {(['all', ...ORDER_STATUS_FLOW, 'cancelled'] as const).map((status, index, arr) => (
          <span key={status} className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setFilter(status)}
              className={`admin-filter ${filter === status ? 'admin-filter-active' : 'admin-filter-inactive'}`}
            >
              {status === 'all' ? 'All' : ORDER_STATUS_LABELS[status]}
            </button>
            {index < arr.length - 1 ? (
              <span className="h-3 w-px bg-white/[0.08]" aria-hidden />
            ) : null}
          </span>
        ))}
      </div>

      <div className="space-y-px bg-white/[0.04]">
        {filteredOrders.length === 0 && (
          <p className="text-muted text-sm font-light p-8 text-center bg-void">
            No orders in this status bucket.
          </p>
        )}

        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="bg-void p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
          >
            <div>
              <h3 className="text-sm font-mono text-primary font-light">
                Order #{order.id.slice(-8).toUpperCase()}
              </h3>
              <p className="text-sm text-secondary font-light mt-2">
                {order.guestEmail ?? order.userId ?? 'Guest'} ·{' '}
                {order.createdAt?.toLocaleString() ?? '—'}
              </p>
              <p className="text-[10px] tracking-caps uppercase text-muted mt-2">
                {order.items.length} line item(s):{' '}
                {order.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
              </p>
              {order.trackingNumber && (
                <p className="text-xs text-secondary font-light mt-2">
                  {order.carrier ?? 'Carrier'} · {order.trackingNumber}
                </p>
              )}
              {(showBatchCoa || showRealShipping) && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {showBatchCoa && (order.status === 'paid' || order.status === 'processing') && (
                    <Button
                      variant="ghost"
                      disabled={updatingId === order.id}
                      onClick={() => void assignBatches(order.id)}
                    >
                      Assign Batches
                    </Button>
                  )}
                  {showRealShipping && !order.trackingNumber && order.userId && (
                    <Button
                      variant="ghost"
                      disabled={updatingId === order.id}
                      onClick={() => void createLabel(order.id)}
                    >
                      Create Label
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="metallic-gold font-medium">${order.total.toFixed(2)}</p>
                <p className="text-[10px] tracking-caps uppercase text-gold-light mt-1">
                  {ORDER_STATUS_LABELS[order.status]}
                </p>
              </div>
              <select
                value={order.status}
                disabled={updatingId === order.id}
                onChange={(event) => updateStatus(order.id, event.target.value as OrderStatus)}
                className="terminal-select w-44"
              >
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
