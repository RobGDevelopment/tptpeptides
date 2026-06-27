'use client';

import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';

export function AccountingExportPanel() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onExport = async () => {
    setError('');
    if (!startDate || !endDate) {
      setError('Select a start and end date.');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/admin/export-orders?${params.toString()}`);

      if (response.status === 404) {
        setError('Accounting export module is disabled.');
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? 'Export failed');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tptpeptides-orders_${startDate}_${endDate}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TerminalPanel className="p-6 bg-void mb-8">
      <h3 className="text-sm tracking-caps uppercase text-primary font-medium mb-2">
        QuickBooks Export
      </h3>
      <p className="text-xs text-secondary font-light mb-6 leading-relaxed">
        Download completed orders with immutable financial fields for accounting import.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
        <label className="flex-1">
          <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Start date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="terminal-input w-full" />
        </label>
        <label className="flex-1">
          <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">End date</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="terminal-input w-full" />
        </label>
        <Button type="button" disabled={loading} onClick={() => void onExport()}>
          {loading ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-400/90 mt-4">{error}</p> : null}
    </TerminalPanel>
  );
}
