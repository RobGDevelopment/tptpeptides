'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { uploadLabResult } from '../../actions/patientCareActions';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

const ACCEPTED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg']);
const ACCEPT_ATTR = '.pdf,.png,.jpg,.jpeg';

type AdminLabUploadFormProps = {
  patientId: string;
};

function isAcceptedLabFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ACCEPTED_EXTENSIONS.has(extension);
}

export function AdminLabUploadForm({ patientId }: AdminLabUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [providerNotes, setProviderNotes] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('A lab document file is required.');
      return;
    }

    if (!isAcceptedLabFile(file)) {
      setError('Unsupported file type. Upload PDF, PNG, or JPG.');
      return;
    }

    const formData = new FormData();
    formData.set('patientId', patientId);
    formData.set('title', title);
    formData.set('providerNotes', providerNotes);
    formData.set('file', file);

    startTransition(async () => {
      const result = await uploadLabResult(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess(`"${result.data.lab.title}" uploaded successfully.`);
      setTitle('');
      setProviderNotes('');
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Lab Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="e.g. Comprehensive Metabolic Panel"
        required
        maxLength={200}
        disabled={pending}
      />

      <div>
        <label className="text-[10px] tracking-caps uppercase text-muted block mb-2">
          Provider Notes
        </label>
        <textarea
          className="terminal-input min-h-[96px] w-full resize-y"
          value={providerNotes}
          onChange={(event) => setProviderNotes(event.target.value)}
          placeholder="Optional clinical context for the patient…"
          maxLength={2000}
          disabled={pending}
        />
      </div>

      <div>
        <label className="text-[10px] tracking-caps uppercase text-muted block mb-2">
          Lab Document
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          required
          disabled={pending}
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
          className="block w-full text-sm text-secondary file:mr-4 file:rounded-sm file:border file:border-white/10 file:bg-surface/40 file:px-3 file:py-2 file:text-[10px] file:tracking-caps file:uppercase file:text-muted hover:file:text-primary"
        />
        {fileName ? (
          <p className="mt-2 text-xs text-muted">Selected: {fileName}</p>
        ) : (
          <p className="mt-2 text-xs text-muted">PDF, PNG, or JPG · max 12 MB</p>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className="text-xs text-gold-light">{success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Uploading…' : 'Upload Lab Result'}
      </Button>
    </form>
  );
}
