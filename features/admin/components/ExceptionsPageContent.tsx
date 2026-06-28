'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Spinner } from '../../../components/ui/Spinner';

interface ExceptionRow {
  id: string;
  type: string;
  message: string;
  orderId?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

const TYPE_LABELS: Record<string, string> = {
  auto_po_failed: 'Auto-PO Failed',
  auto_label_failed: 'Auto-Label Failed',
  tracking_webhook_failed: 'Tracking Webhook',
  lexical_quarantine: 'Lexical Quarantine',
};

export function ExceptionsPageContent() {
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    const response = await adminFetch('/api/admin/exceptions');
    if (response.status === 404) {
      setLoading(false);
      setError('Enable isZeroTouchOpsEnabled in Module Control Center.');
      return;
    }
    if (!response.ok) {
      setError('Unable to load exceptions queue.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { exceptions?: ExceptionRow[] };
    setExceptions(data.exceptions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (exceptionId: string) => {
    setActingId(exceptionId);
    setMessage('');
    const response = await adminFetch('/api/admin/exceptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exceptionId }),
    });
    setActingId(null);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to resolve exception');
      return;
    }
    setMessage('Exception marked resolved.');
    await load();
  };

  const retry = async (exceptionId: string) => {
    setActingId(exceptionId);
    setError('');
    setMessage('');
    const response = await adminFetch('/api/admin/exceptions/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exceptionId }),
    });
    const data = (await response.json()) as { error?: string; message?: string };
    setActingId(null);
    if (!response.ok) {
      setError(data.error ?? 'Retry failed');
      return;
    }
    setMessage(data.message ?? 'Retry succeeded.');
    await load();
  };

  if (loading) {
    return <Spinner label="Loading exceptions queue..." className="py-20" />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Operations Exceptions"
        subtitle="Zero-touch ops failovers — auto-PO, auto-label, and carrier webhook errors requiring intervention."
        beamDelay={2}
      />

      {error && <p className="admin-banner text-red-400/90">{error}</p>}
      {message && <p className="admin-banner text-gold-light">{message}</p>}

      <section className="admin-table-section">
        <div className="p-6 border-b border-white/[0.04] space-y-3">
          <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Open Exceptions</h2>
          <HeaderDividerBeam delay={2} />
          <p className="text-sm text-secondary font-light">
            {exceptions.length} open {exceptions.length === 1 ? 'item' : 'items'} in the exception queue.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Message</th>
                <th>Order</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-10">
                    No open exceptions — STP happy path.
                  </td>
                </tr>
              ) : (
                exceptions.map((row) => {
                  const canRetry =
                    row.type === 'auto_po_failed' || row.type === 'auto_label_failed';
                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="text-[10px] tracking-caps uppercase text-gold-light">
                          {TYPE_LABELS[row.type] ?? row.type}
                        </span>
                      </td>
                      <td className="text-secondary max-w-md">{row.message}</td>
                      <td>
                        {row.orderId ? (
                          <Link
                            href={`/admin/orders`}
                            className="font-mono text-xs text-gold-light hover:text-primary transition-colors"
                          >
                            {row.orderId.slice(-8).toUpperCase()}
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-muted text-xs">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {canRetry && (
                            <Button
                              variant="ghost"
                              className="text-xs px-3 py-1.5"
                              disabled={actingId === row.id}
                              onClick={() => void retry(row.id)}
                            >
                              Retry
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            className="text-xs px-3 py-1.5"
                            disabled={actingId === row.id}
                            onClick={() => void resolve(row.id)}
                          >
                            Manually Resolve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
