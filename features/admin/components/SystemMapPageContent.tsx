'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  JOURNEY_DWELL_MS,
  SIGNAL_TRACE_ACT_LABELS,
  SYSTEM_NODE_MAP,
  buildSignalTraceQueue,
  getConnectedNodeIds,
  type SignalTraceHop,
  type SystemNodeId,
} from '../../../lib/admin/systemMapConfig';
import { cn } from '../../../lib/utils/cn';
import { SystemMapDetailPanel } from './SystemMapDetailPanel';
import { SystemMapGraph, type MapInteractionMode } from './SystemMapGraph';

const ACT_ORDER = ['deploy', 'discover', 'verify', 'procure', 'transact', 'fulfill', 'close', 'retain'] as const;

function JourneyProgressRail({
  queue,
  hopIndex,
  mode,
}: {
  queue: SignalTraceHop[];
  hopIndex: number;
  mode: MapInteractionMode;
}) {
  const currentAct = queue[hopIndex]?.act;
  const actIndices = useMemo(() => {
    const map = new Map<string, number>();
    for (const act of ACT_ORDER) {
      map.set(act, queue.findIndex((h) => h.act === act));
    }
    return map;
  }, [queue]);

  return (
    <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar py-1">
      {ACT_ORDER.map((act) => {
        const firstHop = actIndices.get(act) ?? -1;
        if (firstHop < 0) return null;
        const isPast = hopIndex > firstHop;
        const isCurrent = currentAct === act && mode === 'journey';
        const label = SIGNAL_TRACE_ACT_LABELS[act].replace(/^Act \d · /, '');

        return (
          <div
            key={act}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-2 md:px-3 py-1 border transition-all duration-500',
              isCurrent && 'border-amber-200/40 bg-amber-200/[0.06]',
              isPast && !isCurrent && 'border-white/10 bg-white/[0.02]',
              !isPast && !isCurrent && 'border-white/5 opacity-40'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0 transition-all',
                isCurrent && 'bg-amber-200 shadow-[0_0_6px_rgba(253,230,138,0.8)] animate-pulse',
                isPast && !isCurrent && 'bg-amber-200/50',
                !isPast && !isCurrent && 'bg-stone-600'
              )}
              aria-hidden
            />
            <span
              className={cn(
                'text-[9px] font-bold tracking-widest uppercase whitespace-nowrap',
                isCurrent ? 'text-stone-200' : isPast ? 'text-stone-500' : 'text-stone-600'
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function SystemMapPageContent() {
  const [mode, setMode] = useState<MapInteractionMode>('journey');
  const [hopIndex, setHopIndex] = useState(0);
  const [includeDeploy, setIncludeDeploy] = useState(false);
  const [selectedId, setSelectedId] = useState<SystemNodeId | null>(null);
  const hopIndexRef = useRef(hopIndex);
  hopIndexRef.current = hopIndex;

  const queue = useMemo(() => buildSignalTraceQueue(includeDeploy), [includeDeploy]);

  const currentHop = queue[hopIndex] ?? null;

  const applyHop = useCallback(
    (index: number) => {
      const hop = queue[index];
      if (!hop) return;
      setHopIndex(index);
      setSelectedId(hop.edge.target);
    },
    [queue]
  );

  useEffect(() => {
    if (queue.length === 0) return;
    applyHop(0);
    setMode('journey');
  }, [includeDeploy, queue, applyHop]);

  useEffect(() => {
    if (mode !== 'journey' || queue.length === 0) return;

    const timer = window.setTimeout(() => {
      const next = hopIndexRef.current + 1;
      if (next >= queue.length) {
        window.setTimeout(() => applyHop(0), 1600);
      } else {
        applyHop(next);
      }
    }, JOURNEY_DWELL_MS);

    return () => window.clearTimeout(timer);
  }, [mode, hopIndex, queue, applyHop]);

  const handleSelect = (id: SystemNodeId) => {
    setMode('explore');
    setSelectedId(id);
  };

  const resumeJourney = () => {
    if (selectedId) {
      const matchIndex = queue.findIndex((h) => h.edge.target === selectedId);
      if (matchIndex >= 0) setHopIndex(matchIndex);
    }
    setMode('journey');
  };

  const selectedNode = selectedId ? SYSTEM_NODE_MAP[selectedId] : null;
  const connectedNodes = useMemo(
    () =>
      selectedId ? getConnectedNodeIds(selectedId).map((id) => SYSTEM_NODE_MAP[id]) : [],
    [selectedId]
  );

  const journeyFromId = mode === 'journey' && currentHop ? currentHop.edge.source : null;
  const progressLabel = queue.length > 0 ? `${hopIndex + 1} / ${queue.length}` : '—';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-primary">
      <header className="shrink-0 px-6 md:px-10 pt-6 pb-4 border-b border-white/10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-3 min-w-0">
            <Link
              href="/admin"
              className="inline-block text-[10px] font-bold tracking-widest uppercase text-stone-500 hover:text-amber-200/80 transition-colors"
            >
              ← Return to Dashboard
            </Link>
            <div className="h-[2px] w-full max-w-xs relative overflow-hidden bg-white/[0.02] rounded-full">
              <div className="absolute top-0 bottom-0 w-[50%] bg-gradient-to-r from-transparent via-amber-200/50 to-transparent animate-os-eye" />
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-stone-500 mb-1">
                  {mode === 'journey' ? 'Guided Journey' : 'Free Explore'}
                </p>
                <h1 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-stone-100">
                  System Architecture
                </h1>
              </div>
              <span
                className={cn(
                  'hidden sm:inline-flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-2 py-1 border mt-4',
                  mode === 'journey'
                    ? 'border-amber-200/30 text-amber-200/70 bg-amber-200/[0.04]'
                    : 'border-white/10 text-stone-500 bg-white/[0.02]'
                )}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    mode === 'journey' ? 'bg-amber-200 animate-pulse' : 'bg-stone-500'
                  )}
                  aria-hidden
                />
                {mode === 'journey' ? 'Live' : 'Paused'}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0 max-w-sm">
            {mode === 'journey' && currentHop ? (
              <>
                <p className="text-[10px] font-bold tracking-widest uppercase text-amber-200/60">
                  {SIGNAL_TRACE_ACT_LABELS[currentHop.act]}
                </p>
                <p className="text-sm font-bold text-stone-200 mt-1">{currentHop.headline}</p>
                <p className="text-[10px] font-light text-stone-500 mt-1">Stop {progressLabel}</p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold tracking-widest uppercase text-stone-600">
                  {selectedId ? `${connectedNodes.length} linked systems` : 'Exploring'}
                </p>
                <p className="text-[10px] font-light text-stone-500 mt-1 leading-relaxed">
                  Journey paused — inspect any node, then continue when ready
                </p>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5">
          <JourneyProgressRail queue={queue} hopIndex={hopIndex} mode={mode} />
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="relative flex-1 min-h-0 flex flex-col bg-black">
          <SystemMapGraph
            selectedId={selectedId}
            onSelect={handleSelect}
            mode={mode}
            journeyFromId={journeyFromId}
          />

          {mode === 'explore' ? (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-md">
              <div className="pointer-events-auto flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl px-4 py-3 rounded-sm">
                <p className="text-[10px] text-stone-500 font-light text-center sm:text-left sm:mr-2">
                  Guided journey paused at{' '}
                  <span className="text-stone-300">{SIGNAL_TRACE_ACT_LABELS[currentHop?.act ?? 'discover']}</span>
                </p>
                <button
                  type="button"
                  onClick={resumeJourney}
                  className="shrink-0 text-[10px] font-bold tracking-widest uppercase px-4 py-2 border border-amber-200/40 text-amber-200/90 hover:bg-amber-200/10 hover:text-amber-200 transition-colors whitespace-nowrap"
                >
                  Continue Journey →
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-full lg:w-[min(380px,32vw)] shrink-0 min-h-[280px] lg:min-h-0 border-t lg:border-t-0 lg:border-l border-white/10">
          <SystemMapDetailPanel
            node={selectedNode}
            connectedNodes={connectedNodes}
            traceHop={mode === 'journey' ? currentHop : null}
            mode={mode}
          />
        </div>
      </div>

      <footer className="shrink-0 px-6 md:px-10 py-3 border-t border-white/10 bg-black/80 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-bold tracking-widest uppercase text-stone-600">
          Click any node to pause & explore
        </p>
        <button
          type="button"
          onClick={() => setIncludeDeploy((d) => !d)}
          className={cn(
            'text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border transition-colors',
            includeDeploy
              ? 'border-amber-200/40 text-stone-200 bg-white/[0.06]'
              : 'border-white/10 text-stone-500 hover:text-stone-300'
          )}
        >
          {includeDeploy ? 'Act 0 · On' : 'Act 0 · Deploy'}
        </button>
      </footer>
    </div>
  );
}
