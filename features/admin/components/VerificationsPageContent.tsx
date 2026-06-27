'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Spinner } from '../../../components/ui/Spinner';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import {
  LAB_TYPE_LABELS,
  type InstitutionVerification,
} from '../../../lib/schemas/verification';

type VerificationRow = InstitutionVerification & { id: string };

export function VerificationsPageContent() {
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    const response = await adminFetch('/api/admin/verifications?status=pending');
    if (response.status === 404) {
      window.location.href = '/admin';
      return;
    }
    if (!response.ok) {
      setError('Unable to load verification queue.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { verifications: VerificationRow[] };
    setVerifications(data.verifications);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (userId: string, action: 'approve' | 'reject') => {
    setActingOn(userId);
    setError('');

    const body =
      action === 'approve'
        ? { action: 'approve' as const, institutionTier: 'Bronze' as const }
        : {
            action: 'reject' as const,
            rejectionReason: 'Documentation requires clarification or updated W-9.',
          };

    const response = await adminFetch(`/api/admin/verifications/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setActingOn(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Review action failed');
      return;
    }

    setVerifications((rows) => rows.filter((row) => row.userId !== userId));
  };

  if (loading) {
    return <Spinner label="Loading verification queue..." className="py-16" />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Institution Verifications"
        subtitle="Review Queue · KYB Gateway"
        beamDelay={1}
      />

      {error ? <p className="text-red-400/90 text-sm">{error}</p> : null}

      {verifications.length === 0 ? (
        <TerminalPanel className="p-10 text-center bg-void">
          <p className="text-muted text-xs tracking-caps uppercase">No pending requests</p>
        </TerminalPanel>
      ) : (
        <div className="space-y-px bg-white/[0.04]">
          {verifications.map((row) => (
            <TerminalPanel key={row.userId} className="p-8 bg-void">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                <div className="space-y-3 min-w-0">
                  <p className="text-lg font-light text-heading">{row.institutionName}</p>
                  <p className="text-[10px] tracking-caps uppercase text-muted">{row.email}</p>
                  <HeaderDividerBeam contained delay={2} className="my-4" />
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] tracking-caps uppercase text-muted">EIN / Tax ID</p>
                      <p className="text-secondary font-mono tracking-widest uppercase mt-1">{row.einTaxId}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-caps uppercase text-muted">Lab Type</p>
                      <p className="text-secondary font-light mt-1">{LAB_TYPE_LABELS[row.labType]}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] tracking-caps uppercase text-muted">Document</p>
                      <p className="text-secondary font-light mt-1 font-mono text-xs break-all">
                        {row.documentFileName}
                      </p>
                      <p className="text-muted text-[10px] mt-1 break-all">{row.documentStoragePath}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-caps uppercase text-muted">Submitted</p>
                      <p className="text-secondary font-light mt-1">
                        {new Date(row.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-4 shrink-0">
                  <Button
                    type="button"
                    disabled={actingOn === row.userId}
                    onClick={() => void review(row.userId, 'approve')}
                  >
                    Approve · Bronze Tier
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={actingOn === row.userId}
                    onClick={() => void review(row.userId, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </TerminalPanel>
          ))}
        </div>
      )}
    </div>
  );
}
