'use client';

import Link from 'next/link';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import type { SystemNode } from '../../../lib/admin/systemMapConfig';
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

export function SystemMapDetailPanel({ node }: SystemMapDetailPanelProps) {
  if (!node) {
    return (
      <aside className="system-map-panel flex flex-col justify-center items-center text-center px-8">
        <p className="text-sm text-muted font-light">Select a node to inspect telemetry flow.</p>
      </aside>
    );
  }

  return (
    <aside className="system-map-panel flex flex-col overflow-hidden">
      <HeaderDividerBeam contained delay={0} className="shrink-0" />

      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
        <div>
          <p className="text-[10px] tracking-caps uppercase text-gold/80 mb-2">Node Telemetry</p>
          <h2 className="text-xl md:text-2xl font-light tracking-title uppercase text-heading">
            {node.label}
          </h2>
        </div>

        <Section title="System Purpose">
          <p className="text-sm text-secondary font-light leading-relaxed">{node.purpose}</p>
        </Section>

        <HeaderDividerBeam contained delay={1} animated={false} />

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

        <HeaderDividerBeam contained delay={2} animated={false} />

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

        <Link
          href={node.adminHref}
          className="terminal-link inline-block text-[10px] mt-4"
        >
          {node.adminLinkLabel} →
        </Link>
      </div>

      <HeaderDividerBeam contained delay={3} className="shrink-0" />
    </aside>
  );
}
