'use client';

import { useCallback, useEffect, useState } from 'react';
import { MODULE_FLAG_GROUPS, type ModuleFlagKey, type ModuleFlags } from '../../../lib/schemas/modules';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';
import { Spinner } from '../../../components/ui/Spinner';
import { adminFetchJson } from '../../../lib/admin/adminFetch.client';
import { cn } from '../../../lib/utils/cn';

export function ModulesPageContent() {
  const [flags, setFlags] = useState<ModuleFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<ModuleFlagKey | null>(null);

  const loadFlags = useCallback(async () => {
    setError('');
    const { response, data } = await adminFetchJson<{ flags?: ModuleFlags; error?: string }>(
      '/api/admin/modules'
    );
    if (!response.ok) {
      setError(data.error ?? 'Unable to load modules');
      setLoading(false);
      return;
    }
    setFlags(data.flags ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  const toggleFlag = async (key: ModuleFlagKey, nextValue: boolean) => {
    if (!flags) return;

    const previous = flags;
    setSavingKey(key);
    setFlags({ ...flags, [key]: nextValue });

    const { response, data } = await adminFetchJson<{ flags?: ModuleFlags; error?: string }>(
      '/api/admin/modules',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: nextValue }),
      }
    );
    setSavingKey(null);

    if (!response.ok) {
      setFlags(previous);
      setError(data.error ?? 'Unable to update module');
      return;
    }

    if (data.flags) {
      setFlags(data.flags);
    }
  };

  if (loading) {
    return <Spinner label="Loading module flags..." className="py-16" />;
  }

  if (!flags) {
    return <p className="text-red-400/90 text-sm">{error || 'Module flags unavailable'}</p>;
  }

  return (
    <div className="space-y-10 max-w-4xl">
      <AdminPageHeader
        title="Module Control Center"
        subtitle="Phase 0 · Feature Flags"
        beamDelay={0}
      />

      <p className="text-sm text-secondary font-light leading-relaxed -mt-4">
        Toggle epics live without deploying code. Disabled modules hide UI and return 404 from gated
        API routes. Defaults are off until you enable them here.
      </p>

      {error ? <p className="text-red-400/90 text-sm">{error}</p> : null}

      {flags.updatedAt ? (
        <p className="text-[10px] tracking-caps uppercase text-muted">
          Last updated {new Date(flags.updatedAt).toLocaleString()}
          {flags.updatedBy ? ` · ${flags.updatedBy}` : ''}
        </p>
      ) : null}

      <div className="space-y-8">
        {MODULE_FLAG_GROUPS.map((group) => (
          <section key={group.phase}>
            <h2 className="text-xs tracking-caps uppercase text-muted mb-4">
              Phase {group.phase} — {group.label}
            </h2>
            <div className="space-y-px bg-white/[0.04]">
              {group.flags.map((item) => {
                const enabled = flags[item.key];
                const isSaving = savingKey === item.key;

                return (
                  <TerminalPanel key={item.key} className="p-6 bg-void">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <p className="text-sm text-primary font-light">{item.label}</p>
                        <p className="text-xs text-secondary font-light mt-2 leading-relaxed">
                          {item.description}
                        </p>
                        <p className="text-[10px] font-mono tracking-widest uppercase text-muted mt-3">
                          {item.key}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void toggleFlag(item.key, !enabled)}
                        className={cn(
                          'relative shrink-0 w-12 h-6 rounded-full transition-colors duration-200 border',
                          enabled
                            ? 'bg-gold/20 border-gold/40'
                            : 'bg-white/[0.04] border-white/[0.08]',
                          isSaving && 'opacity-50 cursor-wait'
                        )}
                        aria-pressed={enabled}
                        aria-label={`Toggle ${item.label}`}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200',
                            enabled
                              ? 'left-[calc(100%-1.375rem)] bg-gold shadow-[0_0_8px_rgba(191,149,63,0.5)]'
                              : 'left-0.5 bg-muted'
                          )}
                        />
                      </button>
                    </div>
                  </TerminalPanel>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
