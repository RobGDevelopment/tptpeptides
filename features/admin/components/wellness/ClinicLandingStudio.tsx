'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { updateClinicLandingContent } from '../../actions/clinicContentActions';
import { adminFetch } from '../../../../lib/admin/adminFetch.client';
import { isClinicLandingDirty } from '../../../../lib/clinic/landingDisplay';
import { DEFAULT_CLINIC_LANDING } from '../../../../lib/data/clinicLandingDefaults';
import { CLINIC_THEME_PRESETS } from '../../../../lib/data/clinicThemePresets';
import type { ClinicLandingContent } from '../../../../lib/schemas/clinicLanding';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import {
  ClinicLandingPreview,
  type ClinicPreviewViewport,
} from './ClinicLandingPreview';

type EditorTab = 'theme' | 'media' | 'content';

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

export function ClinicLandingStudio({
  initialContent,
  liveClinicUrl,
  supportEmail,
}: {
  initialContent: ClinicLandingContent;
  liveClinicUrl?: string;
  supportEmail?: string;
}) {
  const [published, setPublished] = useState(initialContent);
  const [draft, setDraft] = useState(initialContent);
  const [tab, setTab] = useState<EditorTab>('theme');
  const [viewport, setViewport] = useState<ClinicPreviewViewport>('desktop');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<'hero' | 'logo' | null>(null);

  useEffect(() => {
    setPublished(initialContent);
    setDraft(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const dirty = useMemo(() => isClinicLandingDirty(draft, published), [draft, published]);

  const updateField = useCallback(
    <K extends keyof ClinicLandingContent>(key: K, value: ClinicLandingContent[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const applyPreset = (presetId: string) => {
    const preset = CLINIC_THEME_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setDraft((current) => ({ ...current, ...preset.colors }));
  };

  const discardDraft = () => {
    setDraft(published);
    setToast({ type: 'success', message: 'Draft reverted to last published version.' });
  };

  const resetDefaults = () => {
    setDraft(DEFAULT_CLINIC_LANDING);
    setToast({ type: 'success', message: 'Draft reset to factory defaults. Save to publish.' });
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
      setToast({ type: 'success', message: 'Image uploaded to draft preview.' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Upload failed.';
      setToast({ type: 'error', message });
    } finally {
      setUploading(null);
    }
  };

  const publish = () => {
    setToast(null);
    startTransition(async () => {
      const result = await updateClinicLandingContent(draft);
      if (!result.ok) {
        setToast({ type: 'error', message: result.error });
        return;
      }
      setPublished(draft);
      setToast({ type: 'success', message: 'Published to live clinic site.' });
    });
  };

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'theme', label: 'Theme' },
    { id: 'media', label: 'Media' },
    { id: 'content', label: 'Content' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm text-primary font-light">Landing studio</h3>
            {dirty ? (
              <span className="text-[9px] tracking-caps uppercase px-2 py-0.5 rounded-sm border border-amber-500/40 bg-amber-500/10 text-amber-200">
                Unsaved draft
              </span>
            ) : (
              <span className="text-[9px] tracking-caps uppercase px-2 py-0.5 rounded-sm border border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                Matches live
              </span>
            )}
          </div>
          <p className="text-xs text-muted font-light max-w-xl">
            Edit on the left — preview updates instantly. Nothing goes live until you publish.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {liveClinicUrl ? (
            <a
              href={liveClinicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-link text-xs px-3 py-2"
            >
              Open live site ↗
            </a>
          ) : null}
          <Button type="button" variant="ghost" onClick={discardDraft} disabled={!dirty || pending}>
            Discard
          </Button>
          <Button type="button" onClick={publish} disabled={!dirty || pending || uploading !== null}>
            {pending ? 'Publishing…' : 'Publish to live'}
          </Button>
        </div>
      </div>

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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,42%)] gap-6 xl:gap-8 items-start">
        <div className="space-y-4 min-w-0">
          <div className="flex flex-wrap gap-1 border-b border-white/[0.06] pb-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 text-[10px] tracking-caps uppercase transition-colors ${
                  tab === item.id
                    ? 'text-gold-light border-b border-gold-light/50 -mb-[9px] pb-2'
                    : 'text-muted hover:text-secondary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'theme' ? (
            <div className="space-y-4">
              <div className="rounded-sm border border-white/[0.06] bg-surface/20 p-4 space-y-3">
                <p className="text-[10px] tracking-caps uppercase text-muted">Preset palettes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CLINIC_THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className="text-left rounded-sm border border-white/[0.06] bg-void/40 p-3 hover:border-white/[0.12] transition-colors"
                    >
                      <div className="flex gap-1 mb-2">
                        {[preset.colors.primaryColor, preset.colors.accentColor, preset.colors.backgroundColor].map(
                          (color) => (
                            <span
                              key={color}
                              className="h-4 w-4 rounded-full border border-black/10"
                              style={{ background: color }}
                            />
                          )
                        )}
                      </div>
                      <p className="text-xs text-primary">{preset.label}</p>
                      <p className="text-[10px] text-muted mt-0.5">{preset.description}</p>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={resetDefaults}
                  className="text-[10px] tracking-caps uppercase text-muted hover:text-secondary"
                >
                  Reset all to factory defaults
                </button>
              </div>

              <div className="rounded-sm border border-white/[0.06] bg-surface/20 p-4 space-y-4">
                <p className="text-[10px] tracking-caps uppercase text-muted">Custom colors</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Primary"
                    type="color"
                    value={draft.primaryColor ?? '#2D6A6A'}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                  />
                  <Input
                    label="Accent"
                    type="color"
                    value={draft.accentColor ?? '#5A9E8F'}
                    onChange={(e) => updateField('accentColor', e.target.value)}
                  />
                  <Input
                    label="Background"
                    type="color"
                    value={draft.backgroundColor ?? '#F4F9F7'}
                    onChange={(e) => updateField('backgroundColor', e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-sm border border-white/[0.06] bg-surface/20 p-4">
                <label className="block space-y-2">
                  <span className="text-[10px] tracking-caps uppercase text-muted">Hero image side</span>
                  <select
                    value={draft.heroImagePosition ?? 'right'}
                    onChange={(e) =>
                      updateField('heroImagePosition', e.target.value as 'left' | 'right')
                    }
                    className="terminal-input w-full text-sm"
                  >
                    <option value="right">Image right · copy left</option>
                    <option value="left">Image left · copy right</option>
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          {tab === 'media' ? (
            <div className="space-y-4">
              <MediaPanel
                title="Hero image"
                imageUrl={draft.heroImageUrl}
                uploading={uploading === 'hero'}
                onUpload={(file) => void uploadImage(file, 'heroImageUrl')}
                onUrlChange={(url) => updateField('heroImageUrl', url || undefined)}
                altField={
                  <Input
                    label="Alt text"
                    value={draft.heroImageAlt ?? ''}
                    onChange={(e) => updateField('heroImageAlt', e.target.value)}
                  />
                }
              />
              <MediaPanel
                title="Navbar logo"
                imageUrl={draft.logoUrl}
                uploading={uploading === 'logo'}
                onUpload={(file) => void uploadImage(file, 'logoUrl')}
                onUrlChange={(url) => updateField('logoUrl', url || undefined)}
              />
            </div>
          ) : null}

          {tab === 'content' ? (
            <div className="space-y-4 rounded-sm border border-white/[0.06] bg-surface/20 p-4">
              <Input
                label="Navbar brand name"
                value={draft.navBrandName ?? ''}
                onChange={(e) => updateField('navBrandName', e.target.value || undefined)}
                placeholder="TPT Wellness Clinic"
              />
              <Input
                label="Wordmark (hero eyebrow)"
                value={draft.wordmark}
                onChange={(e) => updateField('wordmark', e.target.value)}
                required
              />
              <Input
                label="Hero headline"
                value={draft.heroHeadline}
                onChange={(e) => updateField('heroHeadline', e.target.value)}
                required
              />
              <label className="block space-y-2">
                <span className="text-[10px] tracking-caps uppercase text-muted">Hero body</span>
                <textarea
                  value={draft.heroBody}
                  onChange={(e) => updateField('heroBody', e.target.value)}
                  rows={4}
                  className="w-full rounded-sm border border-white/[0.08] bg-surface/30 px-3 py-2 text-sm text-primary"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Primary CTA label"
                  value={draft.primaryCtaLabel}
                  onChange={(e) => updateField('primaryCtaLabel', e.target.value)}
                />
                <Input
                  label="Primary CTA path"
                  value={draft.primaryCtaHref}
                  onChange={(e) => updateField('primaryCtaHref', e.target.value)}
                />
                <Input
                  label="Secondary CTA label"
                  value={draft.secondaryCtaLabel}
                  onChange={(e) => updateField('secondaryCtaLabel', e.target.value)}
                />
                <Input
                  label="Secondary CTA path"
                  value={draft.secondaryCtaHref}
                  onChange={(e) => updateField('secondaryCtaHref', e.target.value)}
                />
              </div>
              <Input
                label="Footer tagline"
                value={draft.footerTagline}
                onChange={(e) => updateField('footerTagline', e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className="xl:sticky xl:top-6 space-y-3">
          <div className="flex gap-2">
            {(['desktop', 'mobile'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewport(mode)}
                className={`text-[10px] tracking-caps uppercase px-3 py-1.5 rounded-sm border transition-colors ${
                  viewport === mode
                    ? 'border-gold-light/40 text-gold-light bg-gold-light/5'
                    : 'border-white/[0.06] text-muted hover:text-secondary'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <ClinicLandingPreview
            draft={draft}
            published={published}
            viewport={viewport}
            supportEmail={supportEmail}
          />
          <p className="text-[10px] text-muted font-light px-1">
            Preview updates as you type. Publish when ready — changes are not live until then.
          </p>
        </div>
      </div>
    </div>
  );
}

function MediaPanel({
  title,
  imageUrl,
  uploading,
  onUpload,
  onUrlChange,
  altField,
}: {
  title: string;
  imageUrl?: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onUrlChange: (url: string) => void;
  altField?: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-white/[0.06] bg-surface/20 p-4 space-y-3">
      <p className="text-[10px] tracking-caps uppercase text-muted">{title}</p>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="max-h-36 w-auto rounded-sm border border-white/[0.08]" />
      ) : null}
      {altField}
      <label className="block space-y-2">
        <span className="text-[10px] tracking-caps uppercase text-muted">Upload</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
          }}
          className="block w-full text-sm text-secondary"
        />
      </label>
      <Input
        label="Or image URL"
        value={imageUrl ?? ''}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="https://..."
      />
    </div>
  );
}
