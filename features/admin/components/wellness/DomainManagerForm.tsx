'use client';

import { useEffect, useState, useTransition } from 'react';
import { addCustomDomain } from '../../actions/domainActions';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

export function DomainManagerForm() {
  const [domain, setDomain] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<
    Array<{ type: string; host: string; value: string }>
  >([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setToast(null);
    setDnsInstructions([]);

    startTransition(async () => {
      const result = await addCustomDomain(domain);

      if (!result.ok) {
        setToast({ type: 'error', message: result.error });
        return;
      }

      const successParts = [
        `Domain "${result.domain}" added to Vercel.`,
        result.firebaseUpdated
          ? 'Saved to tenant_config/tpt-clinic.'
          : 'Firebase tenant config was not updated.',
        result.notice,
      ].filter(Boolean);

      setToast({ type: 'success', message: successParts.join(' ') });
      setDnsInstructions(result.dnsInstructions);
      setDomain('');
    });
  };

  return (
    <div className="space-y-4">
      {toast ? (
        <div
          role="status"
          className={`rounded-sm border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border-gold-light/30 bg-gold-light/5 text-gold-light'
              : 'border-red-500/30 bg-red-500/5 text-red-300'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Custom Clinic Domain"
          type="text"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="new-clinic.com"
          autoComplete="off"
          required
        />
        <p className="text-xs text-muted font-light">
          Attaches the domain to this Vercel project and registers it for the telehealth clinic
          tenant. DNS verification may be required before traffic routes live.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding Domain…' : 'Add Domain'}
        </Button>
      </form>

      {dnsInstructions.length > 0 ? (
        <div className="rounded-sm border border-white/[0.06] bg-surface/30 p-4 space-y-2">
          <p className="text-[10px] tracking-caps uppercase text-muted">DNS Verification</p>
          <ul className="space-y-2 text-xs text-secondary font-mono">
            {dnsInstructions.map((record) => (
              <li key={`${record.type}-${record.host}-${record.value}`}>
                {record.type} {record.host} → {record.value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
