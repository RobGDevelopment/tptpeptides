'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Spinner } from '../../../components/ui/Spinner';

interface LedgerRow {
  id: string;
  orderId: string;
  tenantId: string;
  entryType: string;
  period: string;
  totalDebits: number;
  totalCredits: number;
  currency: string;
  createdAt: string;
  syncedToQbo: boolean;
  syncedAt: string | null;
  qboSyncId: string | null;
  lineCount: number;
}

interface QboSyncStatus {
  configured: boolean;
  lastSyncAt: string | null;
  lastSyncPeriod: string | null;
  lastSyncId: string | null;
}

export function LedgerPageContent() {
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [qboSync, setQboSync] = useState<QboSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const response = await adminFetch('/api/admin/ledger');
    if (!response.ok) {
      setError('Unable to load native ledger.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as {
      entries?: LedgerRow[];
      qboSync?: QboSyncStatus;
    };
    setEntries(data.entries ?? []);
    setQboSync(data.qboSync ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <Spinner label="Loading ledger..." className="py-20" />;
  }

  const syncLabel = qboSync?.lastSyncAt
    ? new Date(qboSync.lastSyncAt).toLocaleString()
    : 'Never synced';

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Native Ledger"
        subtitle="Immutable double-entry journal entries — append-only audit trail synced to QuickBooks."
        beamDelay={2}
        actions={
          <div className="flex items-center gap-3 px-4 py-2 bg-surface/40 backdrop-blur-sm border border-white/[0.06] rounded-sm">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                qboSync?.lastSyncAt ? 'bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400/80'
              }`}
              aria-hidden
            />
            <div>
              <p className="text-[10px] tracking-caps uppercase text-muted">Last QBO Sync</p>
              <p className="text-xs text-secondary font-light">{syncLabel}</p>
              {qboSync?.lastSyncPeriod && (
                <p className="text-[10px] text-muted font-mono">Period {qboSync.lastSyncPeriod}</p>
              )}
            </div>
          </div>
        }
      />

      {error && <p className="admin-banner text-red-400/90">{error}</p>}

      {!qboSync?.configured && (
        <p className="admin-banner text-amber-400/90">
          QuickBooks OAuth is not configured — entries accumulate locally until QBO credentials are set.
        </p>
      )}

      <section className="admin-table-section">
        <div className="p-6 border-b border-white/[0.04] space-y-3">
          <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Journal Entries</h2>
          <HeaderDividerBeam delay={2} />
          <p className="text-sm text-secondary font-light">
            Read-only view of balanced debits/credits written on order clearance. {entries.length} recent entries.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Order</th>
                <th>Period</th>
                <th>Debits</th>
                <th>Credits</th>
                <th>Lines</th>
                <th>QBO</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-10">
                    No journal entries yet — entries appear when orders clear payment.
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs text-muted">{row.id.slice(0, 8)}…</td>
                    <td className="font-mono text-xs text-secondary">{row.orderId.slice(-8).toUpperCase()}</td>
                    <td className="text-secondary">{row.period}</td>
                    <td className="metallic-gold">${row.totalDebits.toFixed(2)}</td>
                    <td className="text-primary">${row.totalCredits.toFixed(2)}</td>
                    <td className="text-muted">{row.lineCount}</td>
                    <td>
                      <span
                        className={`text-[10px] tracking-caps uppercase ${
                          row.syncedToQbo ? 'text-gold-light' : 'text-muted'
                        }`}
                      >
                        {row.syncedToQbo ? 'Synced' : 'Pending'}
                      </span>
                    </td>
                    <td className="text-muted text-xs">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
