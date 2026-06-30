'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { updateClinicLandingContent } from '../../actions/clinicContentActions';
import { adminFetch } from '../../../../lib/admin/adminFetch.client';
import { isClinicLandingDirty } from '../../../../lib/clinic/landingDisplay';
import { formatHeroMediaDimensions, inferMediaTypeFromUrl } from '../../../../lib/clinic/heroMedia';
import { probeHeroMediaFile, probeHeroMediaUrl } from '../../../../lib/clinic/heroMedia.client';
import { DEFAULT_CLINIC_LANDING } from '../../../../lib/data/clinicLandingDefaults';
import { CLINIC_THEME_PRESETS } from '../../../../lib/data/clinicThemePresets';
import type { ClinicLandingContent, HeroMediaAspectRatio } from '../../../../lib/schemas/clinicLanding';
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

  const applyHeroMediaMetadata = useCallback(
    (metadata: {
      url: string;
      mediaType: ClinicLandingContent['heroMediaType'];
      aspectRatio?: HeroMediaAspectRatio;
      width?: number;
      height?: number;
    }) => {
      setDraft((current) => ({
        ...current,
        heroImageUrl: metadata.url,
        heroMediaType: metadata.mediaType,
        heroMediaAspectRatio: metadata.aspectRatio ?? current.heroMediaAspectRatio ?? 'auto',
        heroMediaWidth: metadata.width,
        heroMediaHeight: metadata.height,
      }));
    },
    []
  );

  const uploadLogo = async (file: File) => {
    setUploading('logo');
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
      updateField('logoUrl', data.publicUrl);
      setToast({ type: 'success', message: 'Logo uploaded to draft preview.' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Upload failed.';
      setToast({ type: 'error', message });
    } finally {
      setUploading(null);
    }
  };

  const uploadHeroMedia = async (file: File) => {
    setUploading('hero');
    setToast(null);
    try {
      const probed = await probeHeroMediaFile(file);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('width', String(probed.width));
      formData.append('height', String(probed.height));
      const response = await adminFetch('/api/admin/wellness/clinic-assets', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as {
        ok?: boolean;
        publicUrl?: string;
        mediaType?: ClinicLandingContent['heroMediaType'];
        error?: string;
      };
      if (!response.ok || !data.publicUrl) {
        throw new Error(data.error ?? 'Upload failed.');
      }
      applyHeroMediaMetadata({
        url: data.publicUrl,
        mediaType: data.mediaType ?? probed.mediaType,
        aspectRatio: probed.aspectRatio,
        width: probed.width,
        height: probed.height,
      });
      setToast({
        type: 'success',
        message: `${probed.mediaType === 'video' ? 'Video' : 'Image'} uploaded (${probed.width}×${probed.height}, ${probed.aspectRatio}).`,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Upload failed.';
      setToast({ type: 'error', message });
    } finally {
      setUploading(null);
    }
  };

  const applyHeroMediaUrl = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setDraft((current) => ({
        ...current,
        heroImageUrl: undefined,
        heroMediaWidth: undefined,
        heroMediaHeight: undefined,
      }));
      return;
    }

    const mediaType = inferMediaTypeFromUrl(trimmed);
    const probed = await probeHeroMediaUrl(trimmed);
    applyHeroMediaMetadata({
      url: trimmed,
      mediaType: probed?.mediaType ?? mediaType,
      aspectRatio: probed?.aspectRatio,
      width: probed?.width,
      height: probed?.height,
    });
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
              <HeroMediaPanel
                content={draft}
                uploading={uploading === 'hero'}
                onUpload={(file) => void uploadHeroMedia(file)}
                onUrlChange={(url) => void applyHeroMediaUrl(url)}
                onFieldChange={updateField}
              />
              <MediaPanel
                title="Navbar logo"
                imageUrl={draft.logoUrl}
                uploading={uploading === 'logo'}
                accept="image/jpeg,image/png,image/webp"
                onUpload={(file) => void uploadLogo(file)}
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
                placeholder="TPT Clinic"
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

function HeroMediaPanel({
  content,
  uploading,
  onUpload,
  onUrlChange,
  onFieldChange,
}: {
  content: ClinicLandingContent;
  uploading: boolean;
  onUpload: (file: File) => void;
  onUrlChange: (url: string) => void | Promise<void>;
  onFieldChange: <K extends keyof ClinicLandingContent>(key: K, value: ClinicLandingContent[K]) => void;
}) {
  const mediaUrl = content.heroImageUrl;
  const mediaType = content.heroMediaType ?? 'image';
  const dimensions = formatHeroMediaDimensions(content);
  const aspectOptions: HeroMediaAspectRatio[] = ['auto', '16:9', '9:16', '4:5', '3:4', '1:1'];
  const [urlDraft, setUrlDraft] = useState(mediaUrl ?? '');

  useEffect(() => {
    setUrlDraft(mediaUrl ?? '');
  }, [mediaUrl]);

  return (
    <div className="rounded-sm border border-white/[0.06] bg-surface/20 p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] tracking-caps uppercase text-muted">Hero media</p>
        <p className="text-xs text-muted font-light">
          Upload portrait images (9:16), landscape loops (16:9), or paste a hosted URL. Layout adapts to
          detected dimensions. Bundled default: <code className="text-secondary">/corp/Gold_color_loop_seamless.mp4</code>
        </p>
      </div>

      {mediaUrl ? (
        <div className="rounded-sm border border-white/[0.08] overflow-hidden bg-void/40">
          {mediaType === 'video' ? (
            <video
              src={mediaUrl}
              poster={content.heroVideoPosterUrl}
              muted
              loop
              playsInline
              controls
              className="max-h-48 w-full object-contain bg-black/20"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="" className="max-h-48 w-full object-contain" />
          )}
        </div>
      ) : null}

      {dimensions ? (
        <p className="text-[10px] tracking-caps uppercase text-secondary">
          Detected: {dimensions}
          {content.heroMediaAspectRatio && content.heroMediaAspectRatio !== 'auto'
            ? ` · ${content.heroMediaAspectRatio}`
            : ''}
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-2">
          <span className="text-[10px] tracking-caps uppercase text-muted">Media type</span>
          <select
            value={mediaType}
            onChange={(e) =>
              onFieldChange('heroMediaType', e.target.value as ClinicLandingContent['heroMediaType'])
            }
            className="terminal-input w-full text-sm"
          >
            <option value="image">Image</option>
            <option value="video">Video loop</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-[10px] tracking-caps uppercase text-muted">Frame aspect</span>
          <select
            value={content.heroMediaAspectRatio ?? 'auto'}
            onChange={(e) =>
              onFieldChange('heroMediaAspectRatio', e.target.value as HeroMediaAspectRatio)
            }
            className="terminal-input w-full text-sm"
          >
            {aspectOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'auto' ? 'Auto (from upload)' : option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Input
        label="Alt text / video label"
        value={content.heroImageAlt ?? ''}
        onChange={(e) => onFieldChange('heroImageAlt', e.target.value)}
      />

      {mediaType === 'video' ? (
        <div className="space-y-4 rounded-sm border border-white/[0.06] bg-void/30 p-3">
          <Input
            label="Poster image URL (optional)"
            value={content.heroVideoPosterUrl ?? ''}
            onChange={(e) => onFieldChange('heroVideoPosterUrl', e.target.value || undefined)}
            placeholder="https://..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Loop trim start (sec)"
              type="number"
              min={0}
              step={0.05}
              value={content.heroVideoLoopTrimStart ?? 0}
              onChange={(e) =>
                onFieldChange('heroVideoLoopTrimStart', Number.parseFloat(e.target.value) || 0)
              }
            />
            <Input
              label="Loop trim end (sec)"
              type="number"
              min={0}
              step={0.05}
              value={content.heroVideoLoopTrimEnd ?? 0}
              onChange={(e) =>
                onFieldChange('heroVideoLoopTrimEnd', Number.parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <p className="text-[10px] text-muted font-light">
            Trim glitch frames at the seam without re-exporting. Crossfade looping is always on for hero
            videos.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-secondary">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={content.heroVideoLoop ?? true}
                onChange={(e) => onFieldChange('heroVideoLoop', e.target.checked)}
              />
              Loop
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={content.heroVideoMuted ?? true}
                onChange={(e) => onFieldChange('heroVideoMuted', e.target.checked)}
              />
              Muted autoplay
            </label>
          </div>
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="text-[10px] tracking-caps uppercase text-muted">Upload</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
          }}
          className="block w-full text-sm text-secondary"
        />
        <p className="text-[10px] text-muted font-light">
          Images up to 5 MB · videos up to 48 MB. For larger 8K loops, host externally and paste the URL.
        </p>
      </label>

      <Input
        label="Or media URL"
        value={urlDraft}
        onChange={(e) => setUrlDraft(e.target.value)}
        onBlur={() => void onUrlChange(urlDraft)}
        placeholder="https://..."
      />
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
  accept = 'image/jpeg,image/png,image/webp',
}: {
  title: string;
  imageUrl?: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onUrlChange: (url: string) => void;
  altField?: React.ReactNode;
  accept?: string;
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
          accept={accept}
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
