'use client';

import { collection, onSnapshot, query } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import { db } from '../../../lib/firebase/firestore';
import type { QuoteDocument, QuoteStatus } from '../../../lib/schemas/quote';
import { QUOTE_STATUS_LABELS } from '../../../lib/schemas/quote';

type QuoteRow = QuoteDocument & { id: string };

interface ProductOption {
  id: string;
  name: string;
  tag: string;
  price: number;
  stock: number;
}

const STATUS_CLASS: Record<QuoteStatus, string> = {
  draft: 'text-muted',
  sent: 'text-gold-light',
  accepted: 'text-emerald-400/90',
  expired: 'text-muted',
  cancelled: 'text-red-400/80',
};

export function QuotesPageContent() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Record<string, number>>({});

  const loadQuotes = useCallback(async () => {
    setError('');
    const response = await adminFetch('/api/admin/quotes');
    if (response.status === 404) {
      window.location.href = '/admin';
      return;
    }
    if (!response.ok) {
      setError('Unable to load quotes.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { quotes: QuoteRow[] };
    setQuotes(data.quotes);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

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
              price: Number(data.price ?? 0),
              stock: Number(data.stock ?? 0),
            };
          })
          .filter((row): row is ProductOption => row != null && row.price > 0)
      );
    });
    return () => unsubscribe();
  }, []);

  const selectedItems = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [selected]
  );

  const patchQuote = async (quoteId: string, action: 'send' | 'accept' | 'cancel' | 'expire') => {
    setActingOn(quoteId);
    setError('');
    const response = await adminFetch(`/api/admin/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setActingOn(null);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Quote action failed');
      return;
    }
    const data = (await response.json()) as { quote: QuoteDocument };
    setQuotes((rows) => rows.map((row) => (row.id === quoteId ? { ...row, ...data.quote } : row)));
  };

  const createQuote = async () => {
    if (!customerName.trim() || !customerEmail.trim() || selectedItems.length === 0) {
      setError('Customer name, email, and at least one line item are required.');
      return;
    }

    setCreating(true);
    setError('');
    const response = await adminFetch('/api/admin/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        institutionName: institutionName.trim() || undefined,
        items: selectedItems,
        notes: notes.trim() || undefined,
      }),
    });
    setCreating(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to create quote');
      return;
    }

    const data = (await response.json()) as { quote: QuoteRow };
    setQuotes((rows) => [data.quote, ...rows]);
    setShowForm(false);
    setCustomerName('');
    setCustomerEmail('');
    setInstitutionName('');
    setNotes('');
    setSelected({});
  };

  const openPdf = (quoteId: string) => {
    window.open(`/api/admin/quotes/${quoteId}/pdf`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <Spinner label="Loading quotes..." className="py-16" />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Procurement Quotes"
        subtitle="Generate institutional quotes with tier-aware pricing and printable PDF export"
        beamDelay={2}
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            {showForm ? 'Close Builder' : 'New Quote'}
          </Button>
        }
      />

      {error && <p className="admin-banner">{error}</p>}

      {showForm && (
        <TerminalPanel className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Customer name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
            <Input
              label="Customer email"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
            <Input
              label="Institution (optional)"
              value={institutionName}
              onChange={(event) => setInstitutionName(event.target.value)}
            />
          </div>

          <div>
            <p className="text-[10px] tracking-caps uppercase text-muted mb-3">Line items</p>
            <div className="max-h-64 overflow-y-auto border border-white/[0.06] divide-y divide-white/[0.04]">
              {products.map((product) => (
                <label
                  key={product.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-white/[0.02] cursor-pointer"
                >
                  <span className="text-secondary font-light">
                    {product.name}{' '}
                    <span className="text-muted">
                      ({product.tag}) · ${product.price.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={selected[product.id] ?? 0}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [product.id]: Math.max(0, Number(event.target.value) || 0),
                      }))
                    }
                    className="w-16 bg-transparent border border-white/[0.08] px-2 py-1 text-primary text-right"
                  />
                </label>
              ))}
            </div>
          </div>

          <Input
            label="Internal notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          <Button onClick={() => void createQuote()} disabled={creating}>
            {creating ? 'Creating...' : 'Create Draft Quote'}
          </Button>
        </TerminalPanel>
      )}

      <section className="admin-table-section">
        <div className="p-6 border-b border-white/[0.04] space-y-3">
          <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Quote Register</h2>
          <HeaderDividerBeam delay={2} />
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Valid Until</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    No quotes yet. Create one for an institution prospect or repeat buyer.
                  </td>
                </tr>
              )}
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td className="text-primary">{quote.quoteNumber}</td>
                  <td>
                    <div className="text-secondary">{quote.customerName}</div>
                    <div className="text-xs text-muted">{quote.customerEmail}</div>
                  </td>
                  <td className={STATUS_CLASS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</td>
                  <td className="metallic-gold">${quote.total.toFixed(2)}</td>
                  <td className="text-muted">
                    {new Date(quote.validUntil).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openPdf(quote.id)}
                        className="terminal-link text-[10px]"
                      >
                        PDF
                      </button>
                      {(quote.status === 'sent' || quote.status === 'accepted') && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/checkout/quote?quoteId=${quote.id}`;
                            void navigator.clipboard.writeText(url);
                          }}
                          className="terminal-link text-[10px]"
                        >
                          Copy Checkout Link
                        </button>
                      )}
                      {quote.status === 'draft' && (
                        <button
                          type="button"
                          disabled={actingOn === quote.id}
                          onClick={() => void patchQuote(quote.id, 'send')}
                          className="terminal-link text-[10px]"
                        >
                          Mark Sent
                        </button>
                      )}
                      {(quote.status === 'draft' || quote.status === 'sent') && (
                        <button
                          type="button"
                          disabled={actingOn === quote.id}
                          onClick={() => void patchQuote(quote.id, 'accept')}
                          className="terminal-link text-[10px]"
                        >
                          Accept
                        </button>
                      )}
                      {quote.status !== 'cancelled' && quote.status !== 'expired' && (
                        <button
                          type="button"
                          disabled={actingOn === quote.id}
                          onClick={() => void patchQuote(quote.id, 'cancel')}
                          className="terminal-link text-[10px] text-red-400/80"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
