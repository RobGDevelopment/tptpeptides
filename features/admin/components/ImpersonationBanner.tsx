'use client';

import { useEffect, useState } from 'react';

interface ImpersonationState {
  active: boolean;
  targetEmail?: string;
}

export function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState>({ active: false });
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/admin/impersonation/stop', { credentials: 'include' });
        if (!response.ok) return;
        const data = (await response.json()) as ImpersonationState & { targetEmail?: string };
        setState({ active: Boolean(data.active), targetEmail: data.targetEmail });
      } catch {
        // Not an admin session — no banner
      }
    })();
  }, []);

  const stop = async () => {
    setStopping(true);
    await fetch('/api/admin/impersonation/stop', { method: 'POST', credentials: 'include' });
    window.location.href = '/admin/sales';
  };

  if (!state.active) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-gold/10 border-b border-gold/30 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tracking-caps uppercase text-gold-light">
          Co-browse mode · viewing as {state.targetEmail ?? 'client'}
        </p>
        <button
          type="button"
          disabled={stopping}
          onClick={() => void stop()}
          className="text-[10px] tracking-caps uppercase text-primary hover:text-gold-light transition-colors"
        >
          {stopping ? 'Exiting...' : 'Exit co-browse'}
        </button>
      </div>
    </div>
  );
}
