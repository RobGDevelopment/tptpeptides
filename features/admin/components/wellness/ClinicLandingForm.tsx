'use client';

import { useEffect, useState, useTransition } from 'react';
import { updateClinicLandingContent } from '../../actions/clinicContentActions';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import type { ClinicLandingContent } from '../../../../lib/schemas/clinicLanding';

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

export function ClinicLandingForm({ initialContent }: { initialContent: ClinicLandingContent }) {
  const [content, setContent] = useState(initialContent);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateField = <K extends keyof ClinicLandingContent>(key: K, value: ClinicLandingContent[K]) => {
    setContent((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setToast(null);

    startTransition(async () => {
      const result = await updateClinicLandingContent(content);
      if (!result.ok) {
        setToast({ type: 'error', message: result.error });
        return;
      }
      setToast({ type: 'success', message: 'Clinic landing content saved.' });
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
          label="Wordmark"
          value={content.wordmark}
          onChange={(event) => updateField('wordmark', event.target.value)}
          required
        />
        <Input
          label="Hero headline"
          value={content.heroHeadline}
          onChange={(event) => updateField('heroHeadline', event.target.value)}
          required
        />
        <label className="block space-y-2">
          <span className="text-[10px] tracking-caps uppercase text-muted">Hero body</span>
          <textarea
            value={content.heroBody}
            onChange={(event) => updateField('heroBody', event.target.value)}
            rows={3}
            required
            className="w-full rounded-sm border border-white/[0.08] bg-surface/30 px-3 py-2 text-sm text-primary"
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Primary CTA label"
            value={content.primaryCtaLabel}
            onChange={(event) => updateField('primaryCtaLabel', event.target.value)}
            required
          />
          <Input
            label="Primary CTA path"
            value={content.primaryCtaHref}
            onChange={(event) => updateField('primaryCtaHref', event.target.value)}
            placeholder="/intake"
            required
          />
          <Input
            label="Secondary CTA label"
            value={content.secondaryCtaLabel}
            onChange={(event) => updateField('secondaryCtaLabel', event.target.value)}
            required
          />
          <Input
            label="Secondary CTA path"
            value={content.secondaryCtaHref}
            onChange={(event) => updateField('secondaryCtaHref', event.target.value)}
            placeholder="/dashboard"
            required
          />
        </div>
        <Input
          label="Footer tagline"
          value={content.footerTagline}
          onChange={(event) => updateField('footerTagline', event.target.value)}
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save Clinic Landing'}
        </Button>
      </form>
    </div>
  );
}
