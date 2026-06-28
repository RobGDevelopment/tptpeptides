'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function ResearchCitationForm() {
  const [citationUrl, setCitationUrl] = useState('');
  const [compoundSlug, setCompoundSlug] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await fetch('/api/account/research-citation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citationUrl: citationUrl.trim(),
          compoundSlug: compoundSlug.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { pointsAwarded?: number; error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Unable to submit citation.');
        return;
      }
      setMessage(`+${data.pointsAwarded ?? 25} loyalty points awarded. Thank you for contributing to the research catalog.`);
      setCitationUrl('');
      setCompoundSlug('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-secondary font-light leading-relaxed">
        Submit a published in-vitro research citation that references a catalog compound. Approved URLs earn
        loyalty points (one reward per unique publication).
      </p>
      <Input
        label="Publication URL"
        placeholder="https://doi.org/..."
        value={citationUrl}
        onChange={(event) => setCitationUrl(event.target.value)}
      />
      <Input
        label="Compound slug (optional)"
        placeholder="bpc-157"
        value={compoundSlug}
        onChange={(event) => setCompoundSlug(event.target.value)}
      />
      {error && <p className="text-sm text-red-400/90">{error}</p>}
      {message && <p className="text-sm text-gold-light font-light">{message}</p>}
      <Button type="button" disabled={loading} onClick={() => void submit()} className="text-xs">
        {loading ? 'Submitting…' : 'Submit citation for review credit'}
      </Button>
    </div>
  );
}
