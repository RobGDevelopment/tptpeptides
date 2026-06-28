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
  hopIndex?: number;
  hopTotal?: number;
  onPause?: () => void;
  onResume?: () => void;
}

const PANEL_SHELL =
  'flex flex-col overflow-hidden bg-white/[0.03] backdrop-blur-xl border-t border-l border-white/10 h-full';

function MetaDot({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span className={cn('text-[9px] tracking-wide', accent ? 'text-amber-200' : 'text-stone-300')}>
      {label}
    </span>
  );
}

export function SystemMapDetailPanel({
  node,
  connectedNodes = [],
  traceHop = null,
  mode = 'journey',
  hopIndex = 0,
  hopTotal = 0,
  onPause,
  onResume,
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
      <aside className={cn(PANEL_SHELL, 'justify-center items-center text-center px-6')}>
        <p className="text-xs text-stone-300 font-light">Starting guided journey…</p>
      </aside>
    );
  }

  const moduleEnabled =
    node.moduleKey && moduleFlags ? Boolean(moduleFlags[node.moduleKey]) : null;
  const isPaused = mode === 'explore';

  return (
    <aside className={PANEL_SHELL}>
      <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3 border-b border-white/[0.06]">
        <p className="text-[9px] font-bold tracking-widest uppercase text-stone-400">
          {hopTotal > 0 ? `Stop ${hopIndex + 1} / ${hopTotal}` : 'Telemetry'}
        </p>
        <div className="flex items-center gap-2">
          {mode === 'journey' && onPause ? (
            <button
              type="button"
              onClick={onPause}
              className="text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 text-stone-200 hover:text-white transition-colors"
            >
              Pause
            </button>
          ) : null}
          {isPaused && onResume ? (
            <button
              type="button"
              onClick={onResume}
              className="text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 text-amber-200 hover:text-amber-100 transition-colors"
            >
              Resume →
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-5 py-4 gap-4 overflow-hidden">
        {traceHop && mode === 'journey' ? (
          <div className="shrink-0 space-y-1">
            <p className="text-[9px] font-bold tracking-widest uppercase text-amber-200/90">
              {SIGNAL_TRACE_ACT_LABELS[traceHop.act]}
            </p>
            <p className="text-sm font-bold text-white leading-snug">{traceHop.headline}</p>
            <p className="text-[11px] text-stone-300 font-light leading-relaxed line-clamp-2">
              {traceHop.detail}
            </p>
          </div>
        ) : isPaused && traceHop ? (
          <div className="shrink-0 space-y-1">
            <p className="text-[9px] font-bold tracking-widest uppercase text-stone-400">
              Paused · {SIGNAL_TRACE_ACT_LABELS[traceHop.act]}
            </p>
            <p className="text-sm font-bold text-stone-100 leading-snug">{traceHop.headline}</p>
            <p className="text-[11px] text-stone-300 font-light leading-relaxed line-clamp-2">
              {traceHop.detail}
            </p>
          </div>
        ) : null}

        <div className="shrink-0 h-px w-full relative overflow-hidden bg-white/[0.04]">
          <div className="absolute top-0 bottom-0 w-[45%] bg-gradient-to-r from-transparent via-amber-200/40 to-transparent animate-os-eye" />
        </div>

        <div className="shrink-0 space-y-2">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white leading-tight">
            {node.label}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] uppercase tracking-wider">
            <MetaDot label={ZONE_LABELS[node.zone]} />
            <span className="text-stone-500" aria-hidden>
              ·
            </span>
            <MetaDot
              label={node.implementationStatus}
              accent={node.implementationStatus === 'live'}
            />
            {node.phase ? (
              <>
                <span className="text-stone-500" aria-hidden>
                  ·
                </span>
                <MetaDot label={`Phase ${node.phase}`} accent />
              </>
            ) : null}
            {moduleEnabled !== null ? (
              <>
                <span className="text-stone-500" aria-hidden>
                  ·
                </span>
                <MetaDot label={moduleEnabled ? 'Module on' : 'Module off'} />
              </>
            ) : null}
          </div>
        </div>

        <p className="shrink-0 text-[11px] text-stone-300 font-light leading-relaxed line-clamp-3">
          {node.purpose}
        </p>

        {connectedNodes.length > 0 ? (
          <p className="shrink-0 text-[10px] text-stone-300 font-light leading-snug">
            <span className="text-stone-400 uppercase tracking-wider text-[9px] mr-1.5">Linked</span>
            {connectedNodes.map((n) => n.label).join(' · ')}
          </p>
        ) : null}

        <div className="flex-1 min-h-0 grid grid-cols-2 gap-x-4 gap-y-3 overflow-hidden">
          <div className="min-h-0 flex flex-col">
            <p className="text-[9px] font-bold tracking-widest uppercase text-stone-400 mb-1.5 shrink-0">
              Inputs
            </p>
            <ul className="space-y-1 overflow-hidden">
              {node.inputs.slice(0, 4).map((input) => (
                <li key={input} className="text-[10px] text-stone-300 font-light leading-snug truncate">
                  {input}
                </li>
              ))}
              {node.inputs.length > 4 ? (
                <li className="text-[9px] text-stone-400">+{node.inputs.length - 4} more</li>
              ) : null}
            </ul>
          </div>
          <div className="min-h-0 flex flex-col">
            <p className="text-[9px] font-bold tracking-widest uppercase text-stone-400 mb-1.5 shrink-0">
              Outputs
            </p>
            <ul className="space-y-1 overflow-hidden">
              {node.outputs.slice(0, 4).map((output) => (
                <li key={output} className="text-[10px] text-stone-300 font-light leading-snug truncate">
                  {output}
                </li>
              ))}
              {node.outputs.length > 4 ? (
                <li className="text-[9px] text-stone-400">+{node.outputs.length - 4} more</li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="shrink-0 pt-2 border-t border-white/[0.08] space-y-2">
          {node.infrastructure ? (
            <p className="text-[10px] text-stone-300 font-light truncate">
              <span className="text-stone-400 uppercase tracking-wider text-[9px] mr-1.5">
                Infra
              </span>
              {node.infrastructure.provider}
              {node.infrastructure.service ? ` · ${node.infrastructure.service}` : ''}
            </p>
          ) : null}
          <p className="text-[10px] text-stone-300 font-light">
            <span className="text-stone-400 uppercase tracking-wider text-[9px] mr-1.5">
              Automation
            </span>
            {node.automationStatus}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {node.adminHref && node.adminLinkLabel ? (
              <Link
                href={node.adminHref}
                className="text-[9px] font-bold tracking-widest uppercase text-amber-200 hover:text-amber-100 transition-colors"
              >
                {node.adminLinkLabel} →
              </Link>
            ) : null}
            {node.storefrontHref ? (
              <Link
                href={node.storefrontHref}
                className="text-[9px] font-bold tracking-widest uppercase text-amber-200 hover:text-amber-100 transition-colors"
              >
                Storefront →
              </Link>
            ) : null}
            {node.infrastructure?.externalUrl ? (
              <a
                href={node.infrastructure.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-bold tracking-widest uppercase text-amber-200 hover:text-amber-100 transition-colors truncate max-w-full"
              >
                External →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
