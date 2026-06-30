'use client';

import { useState, useTransition } from 'react';
import { updateTelehealthBillingStrategy } from '../../actions/revenueActions';
import {
  telehealthBillingStrategyLabels,
  type TelehealthBillingStrategy,
} from '../../../../lib/schemas/telehealthBilling';
import { Button } from '../../../../components/ui/Button';

type BillingStrategyPanelProps = {
  initialStrategy: TelehealthBillingStrategy;
};

const STRATEGIES: TelehealthBillingStrategy[] = ['upfront_capture', 'capture_on_approval'];

export function BillingStrategyPanel({ initialStrategy }: BillingStrategyPanelProps) {
  const [strategy, setStrategy] = useState(initialStrategy);
  const [savedStrategy, setSavedStrategy] = useState(initialStrategy);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateTelehealthBillingStrategy(strategy);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setSavedStrategy(result.data.strategy);
      setMessage('Billing strategy saved.');
    });
  };

  return (
    <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-3">
        <h2 className="text-[10px] tracking-caps uppercase text-muted">Compliance Settings</h2>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-secondary font-light max-w-3xl">
          Controls when membership and consultation fees are captured via your payment gateway
          (NMI, 2Accept, Authorize.net, etc.). Use capture on approval when clinical review must
          precede billing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STRATEGIES.map((option) => {
            const selected = strategy === option;
            return (
              <button
                key={option}
                type="button"
                disabled={pending}
                onClick={() => setStrategy(option)}
                className={`rounded-sm border px-4 py-4 text-left transition-colors ${
                  selected
                    ? 'border-gold-light/40 bg-gold-light/5'
                    : 'border-white/[0.08] bg-void/20 hover:border-white/[0.14]'
                }`}
              >
                <p className="text-sm text-primary">{telehealthBillingStrategyLabels[option]}</p>
                <p className="mt-1 text-xs text-muted font-light">
                  {option === 'upfront_capture'
                    ? 'Charge at private intake submission (default for HNW concierge flow).'
                    : 'Authorize at intake; capture only after provider approves eligibility.'}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <Button type="button" disabled={pending || strategy === savedStrategy} onClick={handleSave}>
            Save billing strategy
          </Button>
          {message ? (
            <p className={`text-xs ${message.includes('saved') ? 'text-gold-light' : 'text-red-300'}`}>
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
