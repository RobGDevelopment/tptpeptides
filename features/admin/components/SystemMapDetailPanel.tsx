'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminFetchJson } from '../../../lib/admin/adminFetch.client';
import type { SignalTraceHop, SystemNode } from '../../../lib/admin/systemMapConfig';
import { SIGNAL_TRACE_ACT_LABELS, ZONE_LABELS } from '../../../lib/admin/systemMapConfig';
import type { ModuleFlags } from '../../../lib/schemas/modules';
import { cn } from '../../../lib/utils/cn';
import type { MapInteractionMode } from './SystemMapGraph';

interface SystemMapDetailPanelProps {
  node: SystemNode | null;
  connectedNodes?: SystemNode[];
  traceHop?: SignalTraceHop | null;
  mode?: MapInteractionMode;
}

const PANEL_SHELL =
  'flex flex-col overflow-hidden bg-white/[0.04] backdrop-blur-xl border-t border-l border-white/10 shadow-2xl h-full';

const IMPLEMENTATION_LABELS: Record<SystemNode['implementationStatus'], string> = {
  live: 'Live',
  partial: 'Partial',
  planned: 'Planned',
};

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="text-[10px] font-bold tracking-widest uppercase text-stone-500">{title}</h3>
      {children}
    </section>
  );
}

export function SystemMapDetailPanel({
  node,
  connectedNodes = [],
  traceHop = null,
  mode = 'journey',
}: SystemMapDetailPanelProps) {
  const [moduleFlags, setModuleFlags] = useState<ModuleFlags | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await adminFetchJson<{ flags?: ModuleFlags; error?: string }>(
        '/api/admin/modules'
      );
      if (!cancelled && data.flags) setModuleFlags(data.flags);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!node) {
    return (
      <aside className={cn(PANEL_SHELL, 'justify-center items-center text-center px-8')}>
        <p className="text-sm text-stone-500 font-light">Select a node to inspect telemetry flow.</p>
      </aside>
    );
  }

  const moduleEnabled =
    node.moduleKey && moduleFlags ? Boolean(moduleFlags[node.moduleKey]) : null;

  return (
    <aside className={PANEL_SHELL}>
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
        {traceHop && mode === 'journey' ? (
          <div className="rounded border border-amber-200/25 bg-gradient-to-b from-amber-200/[0.06] to-transparent px-4 py-4 space-y-2">
            <p className="text-[10px] font-bold tracking-widest uppercase text-amber-200/70">
              {SIGNAL_TRACE_ACT_LABELS[traceHop.act]}
            </p>
            <p className="text-sm font-bold text-stone-100">{traceHop.headline}</p>
            <p className="text-sm text-stone-400 font-light leading-relaxed">{traceHop.detail}</p>
          </div>
        ) : null}

        {connectedNodes.length > 0 ? (
          <div className="rounded border border-amber-200/15 bg-amber-200/[0.03] px-4 py-4 space-y-2">
            <p className="text-[10px] font-bold tracking-widest uppercase text-amber-200/60">
              Linked Systems
            </p>
            <ul className="space-y-1.5">
              {connectedNodes.map((linked) => (
                <li
                  key={linked.id}
                  className="text-[11px] text-stone-400 font-light flex items-center gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-amber-200/60 shrink-0 animate-pulse" aria-hidden />
                  {linked.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-stone-500 mb-3">
            Node Telemetry
          </p>
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-stone-100">
            {node.label}
          </h2>
          <div className="h-[2px] w-full mt-4 mb-2 relative overflow-hidden bg-white/[0.02] rounded-full">
            <div className="absolute top-0 bottom-0 w-[50%] bg-gradient-to-r from-transparent via-amber-200/50 to-transparent animate-os-eye" />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 border border-white/10 text-stone-500">
              {ZONE_LABELS[node.zone]}
            </span>
            {node.phase ? (
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 border border-amber-200/20 text-amber-200/70">
                Phase {node.phase}
              </span>
            ) : null}
            <span
              className={cn(
                'text-[9px] font-bold tracking-widest uppercase px-2 py-1 border',
                node.implementationStatus === 'live' && 'border-amber-200/30 text-stone-200',
                node.implementationStatus === 'partial' && 'border-white/15 text-stone-400',
                node.implementationStatus === 'planned' && 'border-white/10 text-stone-500'
              )}
            >
              {IMPLEMENTATION_LABELS[node.implementationStatus]}
            </span>
            {moduleEnabled !== null ? (
              <span
                className={cn(
                  'text-[9px] font-bold tracking-widest uppercase px-2 py-1 border',
                  moduleEnabled
                    ? 'border-amber-200/30 text-stone-200'
                    : 'border-white/10 text-stone-500'
                )}
              >
                Module {moduleEnabled ? 'Enabled' : 'Disabled'}
              </span>
            ) : null}
          </div>
        </div>

        <Section title="System Purpose">
          <p className="text-sm text-stone-400 font-light leading-relaxed">{node.purpose}</p>
        </Section>

        {node.infrastructure ? (
          <Section title="Infrastructure">
            <dl className="space-y-2 text-sm text-stone-400 font-light">
              <div>
                <dt className="text-[10px] font-bold tracking-widest uppercase text-stone-500 mb-0.5">
                  Provider
                </dt>
                <dd>{node.infrastructure.provider}</dd>
              </div>
              {node.infrastructure.service ? (
                <div>
                  <dt className="text-[10px] font-bold tracking-widest uppercase text-stone-500 mb-0.5">
                    Service
                  </dt>
                  <dd>{node.infrastructure.service}</dd>
                </div>
              ) : null}
              {node.infrastructure.envVars?.length ? (
                <div>
                  <dt className="text-[10px] font-bold tracking-widest uppercase text-stone-500 mb-1">
                    Env Vars
                  </dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {node.infrastructure.envVars.map((v) => (
                      <code
                        key={v}
                        className="text-[10px] px-1.5 py-0.5 bg-white/[0.04] border border-white/10 text-stone-500"
                      >
                        {v}
                      </code>
                    ))}
                  </dd>
                </div>
              ) : null}
              {node.infrastructure.externalUrl ? (
                <div>
                  <dt className="text-[10px] font-bold tracking-widest uppercase text-stone-500 mb-0.5">
                    External
                  </dt>
                  <dd>
                    <a
                      href={node.infrastructure.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-amber-200/70 hover:text-amber-200 transition-colors break-all"
                    >
                      {node.infrastructure.externalUrl}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Section>
        ) : null}

        <Section title="Data Inputs">
          <ul className="space-y-2">
            {node.inputs.map((input) => (
              <li key={input} className="flex items-start gap-2 text-sm text-stone-400 font-light">
                <span className="text-amber-200/50 mt-0.5 shrink-0" aria-hidden>
                  ◈
                </span>
                {input}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Output Telemetry">
          <ul className="space-y-2">
            {node.outputs.map((output) => (
              <li key={output} className="flex items-start gap-2 text-sm text-stone-400 font-light">
                <span className="text-amber-200/40 mt-0.5 shrink-0" aria-hidden>
                  ⚡
                </span>
                {output}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Automation Status">
          <p
            className={cn(
              'inline-flex text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border',
              node.automationStatus === 'Fully Automated' &&
                'text-stone-200 border-amber-200/30 bg-white/[0.03]',
              node.automationStatus === 'Requires Admin Approval' &&
                'text-stone-400 border-white/10 bg-white/[0.02]',
              node.automationStatus === 'Hybrid' && 'text-stone-300 border-white/10 bg-white/[0.03]'
            )}
          >
            {node.automationStatus}
          </p>
        </Section>

        <div className="flex flex-col gap-2 pt-2">
          {node.adminHref && node.adminLinkLabel ? (
            <Link
              href={node.adminHref}
              className="text-[10px] font-bold tracking-widest uppercase text-amber-200/70 hover:text-amber-200 transition-colors"
            >
              {node.adminLinkLabel} →
            </Link>
          ) : null}
          {node.storefrontHref ? (
            <Link
              href={node.storefrontHref}
              className="text-[10px] font-bold tracking-widest uppercase text-amber-200/70 hover:text-amber-200 transition-colors"
            >
              Open Storefront Route →
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
