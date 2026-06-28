'use client';

import { useState } from 'react';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  return (
    <div className="max-w-xl py-8">
      <h3 className="text-sm tracking-caps uppercase text-primary font-medium mb-2">
        Inventory Updates
      </h3>
      <p className="text-sm text-secondary font-light mb-6">
        Batch releases and compliance notices for research accounts.
      </p>
      {status === 'done' ? (
        <p className="text-[10px] tracking-caps uppercase text-gold-light">Subscribed</p>
      ) : (
        <form
          className="flex flex-col sm:flex-row gap-6 sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setStatus('loading');
            setMessage('');
            void (async () => {
              const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
              });
              if (!response.ok) {
                const data = (await response.json()) as { error?: string };
                setMessage(data.error ?? 'Unable to subscribe.');
                setStatus('error');
                return;
              }
              setStatus('done');
            })();
          }}
        >
          <label className="flex-1">
            <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="lab@institution.edu"
              className="terminal-input"
            />
          </label>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="terminal-link text-[10px] shrink-0 pb-3 disabled:opacity-50"
          >
            {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>
      )}
      {message && <p className="text-xs text-red-400/90 mt-3">{message}</p>}
      <HeaderDividerBeam delay={2} className="mt-8" />
    </div>
  );
}
