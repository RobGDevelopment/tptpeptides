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
    <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
              'shrink-0 flex items-center gap-1 px-2 py-0.5 transition-all duration-500',
              isCurrent && 'text-amber-200/90',
              isPast && !isCurrent && 'text-stone-500',
              !isPast && !isCurrent && 'text-stone-600 opacity-50'
            )}
          >
            <span
              className={cn(
                'w-1 h-1 rounded-full shrink-0',
                isCurrent && 'bg-amber-200 shadow-[0_0_4px_rgba(253,230,138,0.7)] animate-pulse',
                isPast && !isCurrent && 'bg-amber-200/40',
                !isPast && !isCurrent && 'bg-stone-600'
              )}
              aria-hidden
            />
            <span className="text-[8px] md:text-[9px] font-bold tracking-widest uppercase whitespace-nowrap">
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
  const [pausedHop, setPausedHop] = useState<SignalTraceHop | null>(null);
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
      setPausedHop(null);
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

  const pauseJourney = () => {
    if (currentHop) setPausedHop(currentHop);
    setMode('explore');
  };

  const handleSelect = (id: SystemNodeId) => {
    if (currentHop) setPausedHop(currentHop);
    setMode('explore');
    setSelectedId(id);
  };

  const resumeJourney = () => {
    if (selectedId) {
      const matchIndex = queue.findIndex((h) => h.edge.target === selectedId);
      if (matchIndex >= 0) setHopIndex(matchIndex);
    }
    setPausedHop(null);
    setMode('journey');
  };

  const selectedNode = selectedId ? SYSTEM_NODE_MAP[selectedId] : null;
  const connectedNodes = useMemo(
    () =>
      selectedId ? getConnectedNodeIds(selectedId).map((id) => SYSTEM_NODE_MAP[id]) : [],
    [selectedId]
  );

  const journeyFromId = mode === 'journey' && currentHop ? currentHop.edge.source : null;
  const panelTraceHop = mode === 'journey' ? currentHop : pausedHop;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-primary">
      <header className="shrink-0 px-5 md:px-8 pt-5 pb-3 border-b border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <Link
              href="/admin"
              className="inline-block text-[9px] font-bold tracking-widest uppercase text-stone-500 hover:text-amber-200/80 transition-colors"
            >
              ← Return to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-lg md:text-xl font-bold uppercase tracking-widest text-stone-100">
                System Architecture
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[8px] font-bold tracking-widest uppercase',
                  mode === 'journey' ? 'text-amber-200/70' : 'text-stone-500'
                )}
              >
                <span
                  className={cn(
                    'w-1 h-1 rounded-full',
                    mode === 'journey' ? 'bg-amber-200 animate-pulse' : 'bg-stone-500'
                  )}
                  aria-hidden
                />
                {mode === 'journey' ? 'Guided' : 'Paused'}
              </span>
            </div>
          </div>
          {mode === 'journey' && currentHop ? (
            <p className="text-[10px] font-bold text-stone-300 text-right shrink-0 max-w-[200px] leading-snug hidden sm:block">
              {currentHop.headline}
            </p>
          ) : null}
        </div>
        <div className="mt-3">
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
        </div>

        <div className="w-full lg:w-[min(340px,30vw)] shrink-0 min-h-0 border-t lg:border-t-0 lg:border-l border-white/10">
          <SystemMapDetailPanel
            node={selectedNode}
            connectedNodes={connectedNodes}
            traceHop={panelTraceHop}
            mode={mode}
            hopIndex={hopIndex}
            hopTotal={queue.length}
            onPause={pauseJourney}
            onResume={resumeJourney}
          />
        </div>
      </div>

      <footer className="shrink-0 px-5 md:px-8 py-2 border-t border-white/10 bg-black/80 flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold tracking-widest uppercase text-stone-600">
          {mode === 'journey' ? 'Pause or click a node to read' : 'Resume when ready'}
        </p>
        <button
          type="button"
          onClick={() => setIncludeDeploy((d) => !d)}
          className={cn(
            'text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 transition-colors',
            includeDeploy ? 'text-amber-200/80' : 'text-stone-500 hover:text-stone-400'
          )}
        >
          {includeDeploy ? 'Act 0 on' : 'Act 0 deploy'}
        </button>
      </footer>
    </div>
  );
}
