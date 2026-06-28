'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { Button } from '../../../components/ui/Button';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
  'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function GeoCompliancePanel() {
  const [restrictedStates, setRestrictedStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await adminFetch('/api/admin/compliance');
    if (response.status === 404) {
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setError('Unable to load compliance settings.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { settings: { restrictedStates: string[] } };
    setRestrictedStates(data.settings.restrictedStates);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleState = (state: string) => {
    setRestrictedStates((current) =>
      current.includes(state) ? current.filter((code) => code !== state) : [...current, state]
    );
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    const response = await adminFetch('/api/admin/compliance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restrictedStates }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to save compliance settings');
      return;
    }
    setMessage('Restricted jurisdictions updated.');
  };

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="admin-heading text-xl">Geo Restrictions</h2>
        <p className="admin-subheading">
          Block checkout to selected US states when the compliance module is enabled.
        </p>
      </div>

      {error && <p className="admin-banner">{error}</p>}
      {message && <p className="admin-banner">{message}</p>}

      <div className="admin-table-section p-6 space-y-4">
        <p className="text-[10px] tracking-caps uppercase text-muted">Restricted states</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2 gap-y-3">
          {US_STATES.map((state) => {
            const active = restrictedStates.includes(state);
            return (
              <button
                key={state}
                type="button"
                onClick={() => toggleState(state)}
                className={`text-xs px-2 py-2 border transition-colors ${
                  active
                    ? 'border-red-400/40 text-red-300 bg-red-400/10'
                    : 'border-white/[0.06] text-muted hover:text-secondary'
                }`}
              >
                {state}
              </button>
            );
          })}
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving...' : 'Save Restrictions'}
        </Button>
      </div>
    </div>
  );
}
