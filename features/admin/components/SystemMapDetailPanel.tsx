'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { adminFetchJson } from '../../../lib/admin/adminFetch.client';
import type { SystemNode } from '../../../lib/admin/systemMapConfig';
import { ZONE_LABELS } from '../../../lib/admin/systemMapConfig';
import type { ModuleFlags } from '../../../lib/schemas/modules';
import { cn } from '../../../lib/utils/cn';

interface SystemMapDetailPanelProps {
  node: SystemNode | null;
}

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
      <h3 className="text-[10px] tracking-caps uppercase text-muted font-medium">{title}</h3>
      {children}
    </section>
  );
}

const IMPLEMENTATION_LABELS: Record<SystemNode['implementationStatus'], string> = {
  live: 'Live',
  partial: 'Partial',
  planned: 'Planned',
};

export function SystemMapDetailPanel({ node }: SystemMapDetailPanelProps) {
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
      <aside className="system-map-panel flex flex-col justify-center items-center text-center px-8">
        <p className="text-sm text-muted font-light">Select a node to inspect telemetry flow.</p>
      </aside>
    );
  }

  const moduleEnabled =
    node.moduleKey && moduleFlags ? Boolean(moduleFlags[node.moduleKey]) : null;

  return (
    <aside className="system-map-panel flex flex-col overflow-hidden">
      <HeaderDividerBeam contained delay={0} className="shrink-0" />

      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
        <div>
          <p className="text-[10px] tracking-caps uppercase text-gold/80 mb-2">Node Telemetry</p>
          <h2 className="text-xl md:text-2xl font-light tracking-title uppercase text-heading">
            {node.label}
          </h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[9px] tracking-caps uppercase px-2 py-1 border border-white/10 text-muted">
              {ZONE_LABELS[node.zone]}
            </span>
            {node.phase ? (
              <span className="text-[9px] tracking-caps uppercase px-2 py-1 border border-gold/20 text-gold/70">
                Phase {node.phase}
              </span>
            ) : null}
            <span
              className={cn(
                'text-[9px] tracking-caps uppercase px-2 py-1 border',
                node.implementationStatus === 'live' && 'border-gold/30 text-gold-light bg-gold/5',
                node.implementationStatus === 'partial' && 'border-white/15 text-secondary',
                node.implementationStatus === 'planned' && 'border-white/10 text-muted'
              )}
            >
              {IMPLEMENTATION_LABELS[node.implementationStatus]}
            </span>
            {moduleEnabled !== null ? (
              <span
                className={cn(
                  'text-[9px] tracking-caps uppercase px-2 py-1 border',
                  moduleEnabled
                    ? 'border-gold/40 text-gold-light bg-gold/5'
                    : 'border-white/10 text-muted'
                )}
              >
                Module {moduleEnabled ? 'Enabled' : 'Disabled'}
              </span>
            ) : null}
          </div>
        </div>

        <Section title="System Purpose">
          <p className="text-sm text-secondary font-light leading-relaxed">{node.purpose}</p>
        </Section>

        {node.infrastructure ? (
          <>
            <HeaderDividerBeam contained delay={1} animated={false} />
            <Section title="Infrastructure">
              <dl className="space-y-2 text-sm text-secondary font-light">
                <div>
                  <dt className="text-[10px] tracking-caps uppercase text-muted mb-0.5">Provider</dt>
                  <dd>{node.infrastructure.provider}</dd>
                </div>
                {node.infrastructure.service ? (
                  <div>
                    <dt className="text-[10px] tracking-caps uppercase text-muted mb-0.5">Service</dt>
                    <dd>{node.infrastructure.service}</dd>
                  </div>
                ) : null}
                {node.infrastructure.envVars?.length ? (
                  <div>
                    <dt className="text-[10px] tracking-caps uppercase text-muted mb-1">Env Vars</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {node.infrastructure.envVars.map((v) => (
                        <code
                          key={v}
                          className="text-[10px] px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06] text-muted"
                        >
                          {v}
                        </code>
                      ))}
                    </dd>
                  </div>
                ) : null}
                {node.infrastructure.externalUrl ? (
                  <div>
                    <dt className="text-[10px] tracking-caps uppercase text-muted mb-0.5">External</dt>
                    <dd>
                      <a
                        href={node.infrastructure.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="terminal-link text-[10px] break-all"
                      >
                        {node.infrastructure.externalUrl}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Section>
          </>
        ) : null}

        <HeaderDividerBeam contained delay={2} animated={false} />

        <Section title="Data Inputs">
          <ul className="space-y-2">
            {node.inputs.map((input) => (
              <li key={input} className="flex items-start gap-2 text-sm text-secondary font-light">
                <span className="text-gold mt-0.5 shrink-0" aria-hidden>
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
              <li key={output} className="flex items-start gap-2 text-sm text-secondary font-light">
                <span className="text-gold-light mt-0.5 shrink-0" aria-hidden>
                  ⚡
                </span>
                {output}
              </li>
            ))}
          </ul>
        </Section>

        <HeaderDividerBeam contained delay={3} animated={false} />

        <Section title="Automation Status">
          <p
            className={cn(
              'inline-flex text-[10px] tracking-caps uppercase px-3 py-1.5 border',
              node.automationStatus === 'Fully Automated' &&
                'text-gold-light border-gold/30 bg-gold/5',
              node.automationStatus === 'Requires Admin Approval' &&
                'text-secondary border-white/10 bg-white/[0.02]',
              node.automationStatus === 'Hybrid' && 'text-primary border-white/10 bg-white/[0.03]'
            )}
          >
            {node.automationStatus}
          </p>
        </Section>

        <div className="flex flex-col gap-2 mt-4">
          {node.adminHref && node.adminLinkLabel ? (
            <Link href={node.adminHref} className="terminal-link inline-block text-[10px]">
              {node.adminLinkLabel} →
            </Link>
          ) : null}
          {node.storefrontHref ? (
            <Link href={node.storefrontHref} className="terminal-link inline-block text-[10px]">
              Open Storefront Route →
            </Link>
          ) : null}
        </div>
      </div>

      <HeaderDividerBeam contained delay={3} className="shrink-0" />
    </aside>
  );
}
