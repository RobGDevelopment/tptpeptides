'use client';

import { useEffect, useState, useTransition } from 'react';
import { updateClinicLandingContent } from '../../actions/clinicContentActions';
import { adminFetch } from '../../../../lib/admin/adminFetch.client';
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
  const [uploading, setUploading] = useState<'hero' | 'logo' | null>(null);

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

  const uploadImage = async (file: File, target: 'heroImageUrl' | 'logoUrl') => {
    setUploading(target === 'heroImageUrl' ? 'hero' : 'logo');
    setToast(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await adminFetch('/api/admin/wellness/clinic-assets', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as { ok?: boolean; publicUrl?: string; error?: string };
      if (!response.ok || !data.publicUrl) {
        throw new Error(data.error ?? 'Upload failed.');
      }
      updateField(target, data.publicUrl);
      setToast({ type: 'success', message: 'Image uploaded. Save to publish on the live clinic site.' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Upload failed.';
      setToast({ type: 'error', message });
    } finally {
      setUploading(null);
    }
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-sm border border-white/[0.06] bg-surface/20 p-4">
          <p className="text-[10px] tracking-caps uppercase text-muted">Brand colors (clinic lane only)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Primary color"
              type="color"
              value={content.primaryColor ?? '#2D6A6A'}
              onChange={(event) => updateField('primaryColor', event.target.value)}
            />
            <Input
              label="Accent color"
              type="color"
              value={content.accentColor ?? '#5A9E8F'}
              onChange={(event) => updateField('accentColor', event.target.value)}
            />
            <Input
              label="Background"
              type="color"
              value={content.backgroundColor ?? '#F4F9F7'}
              onChange={(event) => updateField('backgroundColor', event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-sm border border-white/[0.06] bg-surface/20 p-4">
          <p className="text-[10px] tracking-caps uppercase text-muted">Hero image</p>
          {content.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of remote asset
            <img
              src={content.heroImageUrl}
              alt={content.heroImageAlt ?? 'Hero preview'}
              className="max-h-48 w-auto rounded-sm border border-white/[0.08]"
            />
          ) : null}
          <Input
            label="Hero image alt text"
            value={content.heroImageAlt ?? ''}
            onChange={(event) => updateField('heroImageAlt', event.target.value)}
          />
          <label className="block space-y-2">
            <span className="text-[10px] tracking-caps uppercase text-muted">Upload hero image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading === 'hero'}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadImage(file, 'heroImageUrl');
                event.target.value = '';
              }}
              className="block w-full text-sm text-secondary"
            />
          </label>
          <Input
            label="Or paste image URL"
            value={content.heroImageUrl ?? ''}
            onChange={(event) => updateField('heroImageUrl', event.target.value || undefined)}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-4 rounded-sm border border-white/[0.06] bg-surface/20 p-4">
          <p className="text-[10px] tracking-caps uppercase text-muted">Navbar logo</p>
          {content.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.logoUrl} alt="Logo preview" className="h-10 w-auto rounded-sm" />
          ) : null}
          <label className="block space-y-2">
            <span className="text-[10px] tracking-caps uppercase text-muted">Upload logo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading === 'logo'}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadImage(file, 'logoUrl');
                event.target.value = '';
              }}
              className="block w-full text-sm text-secondary"
            />
          </label>
          <Input
            label="Or paste logo URL"
            value={content.logoUrl ?? ''}
            onChange={(event) => updateField('logoUrl', event.target.value || undefined)}
            placeholder="https://..."
          />
        </div>

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
        <Button type="submit" disabled={pending || uploading !== null}>
          {pending ? 'Saving…' : 'Save Clinic Landing'}
        </Button>
      </form>
    </div>
  );
}
