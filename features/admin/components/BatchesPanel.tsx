'use client';

import { collection, onSnapshot, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { db } from '../../../lib/firebase/firestore';
import type { BatchDocument, BatchStatus } from '../../../lib/schemas/batch';
import { BATCH_STATUS_LABELS } from '../../../lib/schemas/batch';

type BatchRow = BatchDocument & { id: string };

interface ProductOption {
  id: string;
  name: string;
  tag: string;
}

export function BatchesPanel() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [lotNumber, setLotNumber] = useState('');
  const [productId, setProductId] = useState('');
  const [quantityReceived, setQuantityReceived] = useState('50');
  const [coaUrl, setCoaUrl] = useState('');
  const [purity, setPurity] = useState('');

  const loadBatches = useCallback(async () => {
    setError('');
    const response = await adminFetch('/api/admin/batches');
    if (response.status === 404) return;
    if (!response.ok) {
      setError('Unable to load batch registry.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { batches: BatchRow[] };
    setBatches(data.batches);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    const productsQuery = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      setProducts(
        snapshot.docs
          .map((doc) => {
            const data = doc.data();
            if (data.active === false) return null;
            return {
              id: doc.id,
              name: String(data.name ?? ''),
              tag: String(data.tag ?? ''),
            };
          })
          .filter((row): row is ProductOption => row != null)
      );
    });
    return () => unsubscribe();
  }, []);

  const createBatch = async () => {
    if (!lotNumber.trim() || !productId) {
      setError('Lot number and product are required.');
      return;
    }

    setCreating(true);
    setError('');
    setMessage('');
    const response = await adminFetch('/api/admin/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lotNumber: lotNumber.trim(),
        productId,
        quantityReceived: Number(quantityReceived) || 1,
        coaUrl: coaUrl.trim() || undefined,
        purity: purity.trim() || undefined,
      }),
    });
    setCreating(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to create batch');
      return;
    }

    const data = (await response.json()) as { batch: BatchRow };
    setBatches((rows) => [data.batch, ...rows]);
    setMessage(`Batch ${data.batch.lotNumber} registered.`);
    setLotNumber('');
    setCoaUrl('');
    setPurity('');
  };

  const updateStatus = async (batchId: string, status: BatchStatus) => {
    const response = await adminFetch(`/api/admin/batches/${batchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    setBatches((rows) => rows.map((row) => (row.id === batchId ? { ...row, status } : row)));
  };

  if (loading) {
    return <Spinner label="Loading batch registry..." className="py-10" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="admin-heading text-xl">Batch &amp; COA Genealogy</h2>
        <p className="admin-subheading">
          Register inbound lots, attach COA URLs, and assign batches to fulfilled orders.
        </p>
      </div>

      {error && <p className="admin-banner">{error}</p>}
      {message && <p className="admin-banner">{message}</p>}

      <div className="admin-table-section p-6 space-y-4">
        <p className="text-[10px] tracking-caps uppercase text-muted">Receive new lot</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Input label="Lot number" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
          <div>
            <label className="text-[10px] tracking-caps uppercase text-muted block mb-2">Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="terminal-select w-full"
            >
              <option value="">Select variant</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.tag})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Quantity received"
            type="number"
            min={1}
            value={quantityReceived}
            onChange={(e) => setQuantityReceived(e.target.value)}
          />
          <Input label="Purity (optional)" value={purity} onChange={(e) => setPurity(e.target.value)} />
          <Input
            label="COA PDF URL (optional)"
            value={coaUrl}
            onChange={(e) => setCoaUrl(e.target.value)}
            placeholder="https://storage.example.com/coa/lot.pdf"
          />
        </div>
        <Button onClick={() => void createBatch()} disabled={creating}>
          {creating ? 'Registering...' : 'Register Batch'}
        </Button>
      </div>

      <HeaderDividerBeam delay={2} />

      <div className="admin-table-section">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Product</th>
                <th>Available</th>
                <th>Status</th>
                <th>COA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    No batches registered yet.
                  </td>
                </tr>
              )}
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td className="font-mono text-primary">{batch.lotNumber}</td>
                  <td>
                    <div className="text-secondary">{batch.productName}</div>
                    <div className="text-xs text-muted">{batch.productTag}</div>
                  </td>
                  <td>
                    {batch.quantityAvailable}/{batch.quantityReceived}
                  </td>
                  <td className="text-gold-light">{BATCH_STATUS_LABELS[batch.status]}</td>
                  <td>
                    {batch.coaUrl ? (
                      <a href={batch.coaUrl} target="_blank" rel="noreferrer" className="terminal-link text-[10px]">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {batch.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => void updateStatus(batch.id, 'quarantine')}
                        className="terminal-link text-[10px] text-red-400/80"
                      >
                        Quarantine
                      </button>
                    )}
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
