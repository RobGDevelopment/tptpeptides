'use client';

import { useState } from 'react';
import { MetallicBeam } from '../../../components/ui/MetallicBeam';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'done'>('idle');

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
            setStatus('done');
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
          <button type="submit" className="terminal-link text-[10px] shrink-0 pb-3">
            Subscribe
          </button>
        </form>
      )}
      <MetallicBeam variant="horizontal" className="mt-8 max-w-xs" />
    </div>
  );
}
