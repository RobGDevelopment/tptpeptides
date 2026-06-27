'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import {
  LAB_TYPE_LABELS,
  type InstitutionVerification,
  type LabType,
} from '../../../lib/schemas/verification';

export function InstitutionVerifyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [verification, setVerification] = useState<InstitutionVerification | null>(null);

  const [institutionName, setInstitutionName] = useState('');
  const [einTaxId, setEinTaxId] = useState('');
  const [labType, setLabType] = useState<LabType>('academic_research');
  const [document, setDocument] = useState<File | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/account/verification');
      if (response.status === 404) {
        router.replace('/account');
        return;
      }
      if (!response.ok) {
        setError('Unable to load verification status.');
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { verification: InstitutionVerification | null };
      setVerification(data.verification);
      if (data.verification) {
        setInstitutionName(data.verification.institutionName);
        setEinTaxId(data.verification.einTaxId);
        setLabType(data.verification.labType);
      }
      setLoading(false);
    })();
  }, [router]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!document) {
        setError('Upload a W-9 or institutional letter.');
        return;
      }

      const formData = new FormData();
      formData.append('institutionName', institutionName);
      formData.append('einTaxId', einTaxId);
      formData.append('labType', labType);
      formData.append('document', document);

      const response = await fetch('/api/account/verification', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Submission failed');
        return;
      }

      router.push('/account');
      router.refresh();
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading verification portal..." className="py-16" />;
  }

  if (verification?.status === 'approved') {
    return (
      <TerminalPanel className="p-8 text-center">
        <p className="text-sm text-gold-light font-light">Institution verified</p>
        <p className="text-secondary text-sm font-light mt-3">
          {verification.institutionName} is approved for institutional procurement workflows.
        </p>
        <Link href="/account" className="terminal-link text-[10px] inline-block mt-8">
          Return to Client Portal
        </Link>
      </TerminalPanel>
    );
  }

  if (verification?.status === 'pending') {
    return (
      <TerminalPanel className="p-8">
        <p className="text-sm text-primary font-light">Verification under review</p>
        <p className="text-secondary text-sm font-light mt-3 leading-relaxed">
          Your documentation for <span className="text-gold-light">{verification.institutionName}</span>{' '}
          is pending Super Admin review. You will receive an email when a decision is recorded.
        </p>
        <HeaderDividerBeam delay={1} className="my-8" />
        <Link href="/account" className="terminal-link text-[10px]">
          Back to Client Portal
        </Link>
      </TerminalPanel>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <TerminalPanel className="p-8 space-y-6">
        <p className="text-sm text-secondary font-light leading-relaxed">
          Submit institutional credentials for B2B procurement access. Upload a W-9 or official
          institutional letter on lab letterhead. Documents are stored securely and reviewed manually.
        </p>

        <Input
          label="Institution Name"
          value={institutionName}
          onChange={(event) => setInstitutionName(event.target.value)}
          required
        />

        <Input
          label="EIN / Tax ID"
          value={einTaxId}
          onChange={(event) => setEinTaxId(event.target.value)}
          required
        />

        <label className="block">
          <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Lab Type</span>
          <select
            value={labType}
            onChange={(event) => setLabType(event.target.value as LabType)}
            className="terminal-select w-full"
          >
            {(Object.entries(LAB_TYPE_LABELS) as [LabType, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">
            Credential Document (PDF, JPG, PNG · max 10 MB)
          </span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
            onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:border-0 file:text-[10px] file:tracking-caps file:uppercase file:bg-white/[0.04] file:text-gold-light hover:file:bg-white/[0.08]"
            required
          />
        </label>

        {verification?.status === 'rejected' && (
          <p className="text-sm text-red-400/90 font-light">
            Previous request rejected: {verification.rejectionReason ?? 'Please resubmit documentation.'}
          </p>
        )}

        {error ? <p className="text-sm text-red-400/90">{error}</p> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit for Review'}
        </Button>
      </TerminalPanel>
    </form>
  );
}
