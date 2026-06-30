'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { createPrescription } from '../../actions/prescriptionActions';

export function PrescriptionForm({
  patientId,
  intakeId,
}: {
  patientId: string;
  intakeId: string;
}) {
  const router = useRouter();
  const [medicationName, setMedicationName] = useState('');
  const [dosageInstructions, setDosageInstructions] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    startTransition(async () => {
      const result = await createPrescription({
        patientId,
        intakeId,
        medicationName,
        dosageInstructions,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess('Prescription issued successfully.');
      setMedicationName('');
      setDosageInstructions('');
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Medication Name"
        value={medicationName}
        onChange={(event) => setMedicationName(event.target.value)}
        placeholder="e.g. Semaglutide 2.5mg"
        required
        maxLength={200}
      />
      <div>
        <label className="text-[10px] tracking-caps uppercase text-muted block mb-2">
          Dosage Instructions
        </label>
        <textarea
          className="terminal-input min-h-[96px] w-full resize-y"
          value={dosageInstructions}
          onChange={(event) => setDosageInstructions(event.target.value)}
          placeholder="e.g. Inject 0.25mg subcutaneously once weekly for 4 weeks."
          required
          maxLength={2000}
        />
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {success ? <p className="text-xs text-gold-light">{success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Issuing…' : 'Issue Prescription'}
      </Button>
    </form>
  );
}
