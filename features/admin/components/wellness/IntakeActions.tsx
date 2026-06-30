'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  updateIntakeStatus,
  type AdminIntakeStatus,
} from '../../actions/wellnessActions';

const STATUS_ACTIONS: { value: AdminIntakeStatus; label: string }[] = [
  { value: 'in_review', label: 'Mark In Review' },
  { value: 'approved', label: 'Approve' },
  { value: 'rejected', label: 'Reject' },
];

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function IntakeActions({
  intakeId,
  currentStatus,
  redirectTo,
}: {
  intakeId: string;
  currentStatus: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleStatusChange = (newStatus: AdminIntakeStatus) => {
    setError('');
    startTransition(async () => {
      const result = await updateIntakeStatus(intakeId, newStatus);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {STATUS_ACTIONS.map((action) => (
          <button
            key={action.value}
            type="button"
            disabled={pending || currentStatus === action.value}
            onClick={() => handleStatusChange(action.value)}
            className="text-[10px] tracking-caps uppercase px-2.5 py-1.5 rounded-sm border border-white/10 text-secondary hover:text-primary hover:border-gold-light/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {action.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] tracking-caps uppercase text-muted capitalize">
        Current: {formatStatusLabel(currentStatus)}
      </p>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {pending ? <p className="text-xs text-muted">Updating…</p> : null}
    </div>
  );
}
