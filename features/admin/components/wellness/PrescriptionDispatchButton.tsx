'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { dispatchPrescriptionToOpenLoop } from '../../actions/openLoopDispatchActions';
import type { PrescriptionDispatchStatus } from '../../../../lib/schemas/prescription';

function formatDispatchLabel(status: PrescriptionDispatchStatus): string {
  return status.replace(/_/g, ' ');
}

export function PrescriptionDispatchButton({
  prescriptionId,
  dispatchStatus,
  externalRxId,
}: {
  prescriptionId: string;
  dispatchStatus: PrescriptionDispatchStatus;
  externalRxId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canDispatch = dispatchStatus === 'pending' || dispatchStatus === 'failed';

  const handleDispatch = () => {
    setError('');
    setSuccess('');
    startTransition(async () => {
      const result = await dispatchPrescriptionToOpenLoop(prescriptionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Dispatched · Rx ${result.externalRxId}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-1">
      <p className="text-[10px] tracking-caps uppercase text-muted capitalize">
        Dispatch: {formatDispatchLabel(dispatchStatus)}
      </p>
      {externalRxId ? (
        <p className="text-xs text-secondary font-mono">Partner ID: {externalRxId.slice(0, 12)}…</p>
      ) : null}
      {canDispatch ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void handleDispatch()}
          className="text-[10px] tracking-caps uppercase px-2.5 py-1.5 rounded-sm border border-white/10 text-secondary hover:text-primary hover:border-gold-light/40 transition-colors disabled:opacity-40"
        >
          {pending ? 'Dispatching…' : dispatchStatus === 'failed' ? 'Retry Dispatch' : 'Dispatch to OpenLoop'}
        </button>
      ) : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {success ? <p className="text-xs text-gold-light">{success}</p> : null}
    </div>
  );
}
