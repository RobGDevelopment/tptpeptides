'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  getIntegrationDetail,
  saveIntegrationPublicConfig,
  saveIntegrationSecrets,
  updateIntegrationMode,
} from '../../actions/integrationActions';
import { IntegrationSecretFields } from './IntegrationSecretFields';
import { IntegrationTestButton } from './IntegrationTestButton';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { getIntegrationDefinition } from '../../../../lib/integrations/registry';
import {
  MODE_LABELS,
  PUBLIC_CONFIG_FIELD_LABELS,
  PUBLIC_CONFIG_FIELDS,
} from '../../../../lib/integrations/fieldLabels';
import type {
  IntegrationMode,
  IntegrationPublicConfig,
  IntegrationSecretPayload,
  IntegrationSlug,
} from '../../../../lib/integrations/types';
import type { PlatformIntegrationDetail } from '../../../../lib/schemas/platformIntegrations';

type ToastHandler = (toast: { type: 'success' | 'error'; message: string }) => void;

type IntegrationDetailDrawerProps = {
  slug: IntegrationSlug | null;
  onClose: () => void;
  onUpdated: () => void;
  onToast: ToastHandler;
};

function collectSecretFields(
  slug: IntegrationSlug,
  mode: IntegrationMode
): (keyof IntegrationSecretPayload)[] {
  const definition = getIntegrationDefinition(slug);
  const fields = new Set<keyof IntegrationSecretPayload>();

  if (mode === 'sandbox' || mode === 'disconnected') {
    for (const field of definition.requiredSecrets.sandbox ?? definition.requiredSecrets.live) {
      fields.add(field);
    }
  }

  if (mode === 'live' || mode === 'disconnected') {
    for (const field of definition.requiredSecrets.live) {
      fields.add(field);
    }
  }

  if (definition.supportsWebhooks) {
    fields.add('webhookSigningSecret');
  }

  if (slug === 'slack') {
    fields.add('webhookUrl');
  }

  return Array.from(fields);
}

export function IntegrationDetailDrawer({
  slug,
  onClose,
  onUpdated,
  onToast,
}: IntegrationDetailDrawerProps) {
  const [detail, setDetail] = useState<PlatformIntegrationDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [publicConfigDraft, setPublicConfigDraft] = useState<IntegrationPublicConfig>({});
  const [sandboxSecrets, setSandboxSecrets] = useState<Partial<Record<keyof IntegrationSecretPayload, string>>>({});
  const [liveSecrets, setLiveSecrets] = useState<Partial<Record<keyof IntegrationSecretPayload, string>>>({});

  useEffect(() => {
    if (!slug) {
      setDetail(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadError(null);

    startTransition(async () => {
      try {
        const next = await getIntegrationDetail(slug);
        if (cancelled) return;
        setDetail(next);
        setPublicConfigDraft(next.publicConfig as IntegrationPublicConfig);
        setSandboxSecrets({});
        setLiveSecrets({});
      } catch (caught) {
        if (cancelled) return;
        setLoadError(caught instanceof Error ? caught.message : 'Unable to load integration.');
        setDetail(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const definition = slug ? getIntegrationDefinition(slug) : null;

  const publicFields = useMemo(() => {
    if (!slug) return [];
    return PUBLIC_CONFIG_FIELDS[slug] ?? ['baseUrl'];
  }, [slug]);

  const sandboxFields = useMemo(() => {
    if (!slug) return [];
    return collectSecretFields(slug, 'sandbox');
  }, [slug]);

  const liveFields = useMemo(() => {
    if (!slug) return [];
    return collectSecretFields(slug, 'live');
  }, [slug]);

  if (!slug) return null;

  const handleModeChange = (mode: IntegrationMode) => {
    if (!definition?.modes.includes(mode)) return;

    startTransition(async () => {
      const result = await updateIntegrationMode(slug, mode);
      if (!result.ok) {
        onToast({ type: 'error', message: result.error });
        return;
      }

      const refreshed = await getIntegrationDetail(slug);
      setDetail(refreshed);
      onToast({ type: 'success', message: `Mode set to ${MODE_LABELS[mode]}.` });
      onUpdated();
    });
  };

  const handleSavePublicConfig = () => {
    startTransition(async () => {
      const result = await saveIntegrationPublicConfig({ slug, publicConfig: publicConfigDraft });
      if (!result.ok) {
        onToast({ type: 'error', message: result.error });
        return;
      }

      const refreshed = await getIntegrationDetail(slug);
      setDetail(refreshed);
      onToast({ type: 'success', message: 'Public configuration saved.' });
      onUpdated();
    });
  };

  const handleSaveSecrets = (credentialMode: 'sandbox' | 'live') => {
    const secrets = credentialMode === 'sandbox' ? sandboxSecrets : liveSecrets;
    const hasInput = Object.values(secrets).some((value) => value?.trim());

    if (!hasInput) {
      onToast({ type: 'error', message: 'Enter at least one credential field to save.' });
      return;
    }

    startTransition(async () => {
      const result = await saveIntegrationSecrets({ slug, mode: credentialMode, secrets });
      if (!result.ok) {
        onToast({ type: 'error', message: result.error });
        return;
      }

      const refreshed = await getIntegrationDetail(slug);
      setDetail(refreshed);
      if (credentialMode === 'sandbox') setSandboxSecrets({});
      else setLiveSecrets({});

      onToast({ type: 'success', message: `${MODE_LABELS[credentialMode]} credentials saved.` });
      onUpdated();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close integration drawer"
        onClick={onClose}
      />

      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-white/[0.06] bg-[#0a0a0b] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-[10px] tracking-caps uppercase text-muted">Integration Hub</p>
            <h2 className="text-lg font-light text-primary">{detail?.label ?? slug}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-primary text-sm transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {loadError ? (
            <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
              {loadError}
            </div>
          ) : null}

          {detail && definition ? (
            <>
              {definition.availability === 'coming_soon' ? (
                <div className="rounded-sm border border-gold-light/20 bg-gold-light/5 p-4 text-sm text-gold-light">
                  OAuth configuration for {definition.label} arrives in v1.1.
                </div>
              ) : (
                <>
                  <p className="text-sm text-secondary font-light">{definition.description}</p>

                  <section className="space-y-3">
                    <h3 className="text-[10px] tracking-caps uppercase text-muted">Connection mode</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {definition.modes.map((mode) => {
                        const selected = detail.mode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            disabled={pending}
                            onClick={() => handleModeChange(mode)}
                            className={`rounded-sm border px-3 py-2 text-[10px] tracking-caps uppercase transition-colors ${
                              selected
                                ? 'border-gold-light/40 bg-gold-light/10 text-gold-light'
                                : 'border-white/[0.08] text-muted hover:border-white/[0.14] hover:text-secondary'
                            }`}
                          >
                            {MODE_LABELS[mode]}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-4 rounded-sm border border-white/[0.06] bg-surface/20 p-4">
                    <h3 className="text-[10px] tracking-caps uppercase text-muted">Public configuration</h3>
                    {publicFields.map((field) => (
                      <Input
                        key={field}
                        label={PUBLIC_CONFIG_FIELD_LABELS[field] ?? field}
                        value={String(publicConfigDraft[field] ?? '')}
                        onChange={(event) =>
                          setPublicConfigDraft((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                        disabled={pending}
                      />
                    ))}
                    <Button type="button" variant="secondary" disabled={pending} onClick={handleSavePublicConfig}>
                      Save public config
                    </Button>
                  </section>

                  {definition.modes.includes('sandbox') ? (
                    <section className="space-y-4 rounded-sm border border-white/[0.06] bg-surface/20 p-4">
                      <IntegrationSecretFields
                        credentialMode="sandbox"
                        fields={sandboxFields}
                        maskedSecrets={detail.maskedSecrets.sandbox}
                        values={sandboxSecrets}
                        onChange={(field, value) =>
                          setSandboxSecrets((current) => ({ ...current, [field]: value }))
                        }
                        disabled={pending}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => handleSaveSecrets('sandbox')}
                      >
                        Save sandbox credentials
                      </Button>
                    </section>
                  ) : null}

                  {definition.modes.includes('live') ? (
                    <section className="space-y-4 rounded-sm border border-white/[0.06] bg-surface/20 p-4">
                      <IntegrationSecretFields
                        credentialMode="live"
                        fields={liveFields}
                        maskedSecrets={detail.maskedSecrets.live}
                        values={liveSecrets}
                        onChange={(field, value) =>
                          setLiveSecrets((current) => ({ ...current, [field]: value }))
                        }
                        disabled={pending}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => handleSaveSecrets('live')}
                      >
                        Save live credentials
                      </Button>
                    </section>
                  ) : null}

                  {definition.supportsConnectionTest ? (
                    <section className="space-y-3 rounded-sm border border-white/[0.06] bg-surface/20 p-4">
                      <h3 className="text-[10px] tracking-caps uppercase text-muted">Connection test</h3>
                      {detail.lastTestedAt ? (
                        <p className="text-xs text-muted">
                          Last test: {new Date(detail.lastTestedAt).toLocaleString()} —{' '}
                          <span
                            className={
                              detail.lastTestStatus === 'success' ? 'text-emerald-300' : 'text-red-300'
                            }
                          >
                            {detail.lastTestStatus ?? 'unknown'}
                          </span>
                          {detail.lastTestError ? ` — ${detail.lastTestError}` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-muted">No connection test run yet.</p>
                      )}
                      <IntegrationTestButton
                        slug={slug}
                        disabled={pending || detail.mode === 'disconnected'}
                        onResult={(result) => {
                          if (!result.ok) {
                            onToast({ type: 'error', message: result.error });
                            return;
                          }
                          onToast({
                            type: 'success',
                            message: result.detail ?? 'Connection test succeeded.',
                          });
                          startTransition(async () => {
                            const refreshed = await getIntegrationDetail(slug);
                            setDetail(refreshed);
                            onUpdated();
                          });
                        }}
                      />
                    </section>
                  ) : null}
                </>
              )}
            </>
          ) : !loadError ? (
            <p className="text-sm text-muted">Loading integration…</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
