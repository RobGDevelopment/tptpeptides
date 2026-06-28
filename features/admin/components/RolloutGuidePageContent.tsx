'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import {
  ROLLOUT_ENV_REFERENCE,
  ROLLOUT_GLOBAL_STEPS,
  ROLLOUT_PHASES_WITH_COMMERCIAL,
  type RolloutPhase,
  type RolloutStep,
} from '../../../lib/admin/rolloutGuide';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Spinner } from '../../../components/ui/Spinner';

export function RolloutGuidePageContent() {
  const [algoliaStatus, setAlgoliaStatus] = useState<{ enabled: boolean; configured: boolean } | null>(
    null
  );
  const [reindexMessage, setReindexMessage] = useState('');
  const [reindexing, setReindexing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    const response = await adminFetch('/api/admin/search/reindex');
    if (response.ok) {
      setAlgoliaStatus((await response.json()) as { enabled: boolean; configured: boolean });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runAlgoliaReindex = async () => {
    setReindexMessage('');
    setReindexing(true);
    try {
      const response = await adminFetch('/api/admin/search/reindex', { method: 'POST' });
      const data = (await response.json()) as { indexed?: number; error?: string };
      if (!response.ok) {
        setReindexMessage(data.error ?? 'Reindex failed.');
        return;
      }
      setReindexMessage(`Indexed ${data.indexed ?? 0} catalog records into Algolia.`);
    } finally {
      setReindexing(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading rollout guide..." className="py-20" />;
  }

  return (
    <div className="space-y-12 max-w-4xl">
      <AdminPageHeader
        title="V2 Rollout Playbook"
        subtitle="Execute these steps when you are ready to go live with each phase. Enable module flags only after prerequisites are complete."
      />

      <section className="border border-gold/20 rounded-sm p-6 space-y-4 bg-gold/[0.03]">
        <h2 className="text-[10px] tracking-caps uppercase text-gold-light">Quick links</h2>
        <div className="flex flex-wrap gap-4 text-xs tracking-caps uppercase">
          <Link href="/admin/modules" className="text-secondary hover:text-gold-light transition-colors">
            Module toggles
          </Link>
          <Link href="/admin/growth" className="text-secondary hover:text-gold-light transition-colors">
            Growth jobs
          </Link>
          <Link href="/admin/proforma" className="text-secondary hover:text-gold-light transition-colors">
            Proforma model
          </Link>
          <Link href="/admin/satellites" className="text-secondary hover:text-gold-light transition-colors">
            Satellites
          </Link>
          <Link href="/admin/sales" className="text-secondary hover:text-gold-light transition-colors">
            Sales CC
          </Link>
          <Link href="/catalog" className="text-secondary hover:text-gold-light transition-colors">
            Storefront catalog
          </Link>
          <a
            href="https://vercel.com/docs/cron-jobs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:text-gold-light transition-colors"
          >
            Vercel Cron docs ↗
          </a>
        </div>
      </section>

      <section id="global" className="space-y-6">
        <h2 className="text-lg font-light text-heading tracking-title uppercase">Global prerequisites</h2>
        {ROLLOUT_GLOBAL_STEPS.map((step, index) => (
          <StepCard key={step.id} step={step} index={index} />
        ))}
      </section>

      {ROLLOUT_PHASES_WITH_COMMERCIAL.map((phase) => (
        <PhaseSection
          key={phase.id}
          phase={phase}
          algoliaStatus={algoliaStatus}
          reindexMessage={reindexMessage}
          reindexing={reindexing}
          onReindex={() => void runAlgoliaReindex()}
        />
      ))}

      <section id="env-reference" className="space-y-6">
        <h2 className="text-lg font-light text-heading tracking-title uppercase">Environment variable reference</h2>
        <div className="border border-white/[0.06] rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] tracking-caps uppercase text-muted border-b border-white/[0.06]">
                <th className="text-left p-4 font-medium">Variable</th>
                <th className="text-left p-4 font-medium">Scope</th>
                <th className="text-left p-4 font-medium">Phase</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody>
              {ROLLOUT_ENV_REFERENCE.map((row) => (
                <tr key={row.name} className="border-b border-white/[0.04] last:border-0">
                  <td className="p-4 font-mono text-xs text-gold-light">{row.name}</td>
                  <td className="p-4 text-muted text-xs uppercase tracking-caps">{row.scope}</td>
                  <td className="p-4 text-secondary text-xs">{row.phases}</td>
                  <td className="p-4 text-secondary font-light text-xs hidden md:table-cell">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PhaseSection({
  phase,
  algoliaStatus,
  reindexMessage,
  reindexing,
  onReindex,
}: {
  phase: RolloutPhase;
  algoliaStatus: { enabled: boolean; configured: boolean } | null;
  reindexMessage: string;
  reindexing: boolean;
  onReindex: () => void;
}) {
  return (
    <section id={phase.id} className="space-y-6">
      <div>
        <p className="text-[10px] tracking-caps uppercase text-muted">Phase {phase.phase}</p>
        <h2 className="text-lg font-light text-heading tracking-title uppercase mt-1">{phase.title}</h2>
        <p className="text-sm text-secondary font-light mt-2 leading-relaxed">{phase.summary}</p>
        {phase.moduleFlags.length > 0 && (
          <p className="text-xs text-muted mt-3 font-mono">{phase.moduleFlags.join(' · ')}</p>
        )}
        {phase.adminPaths.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {phase.adminPaths.map((path) => (
              <Link
                key={path}
                href={path}
                className="text-[10px] tracking-caps uppercase text-gold-light hover:text-primary transition-colors"
              >
                {path} →
              </Link>
            ))}
          </div>
        )}
      </div>

      {phase.id === 'phase-5' && (
        <div
          id="action-algolia-reindex"
          className="border border-white/[0.06] rounded-sm p-6 space-y-4"
        >
          <h3 className="text-[10px] tracking-caps uppercase text-muted">In-app action · Algolia reindex</h3>
          <p className="text-sm text-secondary font-light">
            Status:{' '}
            {algoliaStatus?.enabled ? (
              <span className="text-gold-light">module enabled</span>
            ) : (
              <span className="text-muted">module disabled</span>
            )}
            {' · '}
            {algoliaStatus?.configured ? (
              <span className="text-gold-light">keys configured</span>
            ) : (
              <span className="text-amber-400/90">keys missing</span>
            )}
          </p>
          <Button type="button" disabled={reindexing} onClick={onReindex} className="text-xs">
            {reindexing ? 'Indexing catalog…' : 'Reindex catalog to Algolia'}
          </Button>
          {reindexMessage && <p className="text-sm text-gold-light font-light">{reindexMessage}</p>}
        </div>
      )}

      {phase.steps.map((step, index) => (
        <StepCard key={step.id} step={step} index={index} />
      ))}

      <HeaderDividerBeam animated={false} />
    </section>
  );
}

function StepCard({ step, index }: { step: RolloutStep; index: number }) {
  return (
    <article id={step.id} className="border border-white/[0.06] rounded-sm p-6 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-[10px] tracking-caps uppercase text-muted mt-0.5">{index + 1}.</span>
        <div className="flex-1 space-y-2">
          <h3 className="text-sm text-primary font-light">
            {step.title}
            {step.optional ? (
              <span className="ml-2 text-[10px] tracking-caps uppercase text-muted">Optional</span>
            ) : null}
          </h3>
          <p className="text-sm text-secondary font-light leading-relaxed">{step.body}</p>

          {step.envVars?.length ? (
            <p className="text-xs font-mono text-gold-light/90">{step.envVars.join(' · ')}</p>
          ) : null}

          {step.links?.length ? (
            <ul className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
              {step.links.map((link) => (
                <li key={link.href + link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] tracking-caps uppercase text-gold-light hover:text-primary transition-colors"
                    >
                      {link.label} ↗
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[10px] tracking-caps uppercase text-gold-light hover:text-primary transition-colors"
                    >
                      {link.label} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          {step.code ? (
            <pre className="mt-3 p-4 rounded-sm bg-black/40 border border-white/[0.06] text-xs text-secondary font-mono overflow-x-auto whitespace-pre-wrap">
              {step.code}
            </pre>
          ) : null}
        </div>
      </div>
    </article>
  );
}
