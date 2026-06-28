'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import {
  DEFAULT_SYSTEM_NODE_ID,
  SIGNAL_TRACE_ACT_LABELS,
  SIGNAL_TRACE_HOP_MS,
  SYSTEM_NODE_MAP,
  buildSignalTraceQueue,
  systemEdgeKey,
  type SignalTraceHop,
  type SystemNodeId,
} from '../../../lib/admin/systemMapConfig';
import { cn } from '../../../lib/utils/cn';
import { SystemMapDetailPanel } from './SystemMapDetailPanel';
import { SystemMapGraph } from './SystemMapGraph';

function TraceControl({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[10px] font-bold tracking-widest uppercase px-4 py-2 border transition-colors',
        active
          ? 'border-amber-200/40 text-stone-200 bg-white/[0.06]'
          : 'border-white/10 text-stone-500 hover:text-stone-300 hover:border-white/20'
      )}
    >
      {label}
    </button>
  );
}

export function SystemMapPageContent() {
  const [includeDeploy, setIncludeDeploy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hopIndex, setHopIndex] = useState(0);
  const [visitedEdgeKeys, setVisitedEdgeKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [visitedNodeIds, setVisitedNodeIds] = useState<ReadonlySet<SystemNodeId>>(() =>
    new Set<SystemNodeId>([DEFAULT_SYSTEM_NODE_ID])
  );
  const [flareNodeId, setFlareNodeId] = useState<SystemNodeId | null>(null);
  const [flareGeneration, setFlareGeneration] = useState(0);
  const [cometGeneration, setCometGeneration] = useState(0);
  const [selectedId, setSelectedId] = useState<SystemNodeId>(DEFAULT_SYSTEM_NODE_ID);
  const [manualSelection, setManualSelection] = useState(false);

  const queue = useMemo(() => buildSignalTraceQueue(includeDeploy), [includeDeploy]);
  const currentHop: SignalTraceHop | undefined = queue[hopIndex];
  const activeEdgeKey = currentHop ? systemEdgeKey(currentHop.edge) : null;

  const activeNodeIds = useMemo(() => {
    if (!currentHop) return new Set<SystemNodeId>();
    return new Set<SystemNodeId>([currentHop.edge.source, currentHop.edge.target]);
  }, [currentHop]);

  const resetTrace = useCallback(
    (play = true) => {
      const first = buildSignalTraceQueue(includeDeploy)[0];
      setHopIndex(0);
      setVisitedEdgeKeys(new Set());
      setVisitedNodeIds(new Set<SystemNodeId>([first?.edge.source ?? DEFAULT_SYSTEM_NODE_ID]));
      setFlareNodeId(null);
      setFlareGeneration((n) => n + 1);
      setCometGeneration((n) => n + 1);
      setManualSelection(false);
      setSelectedId(first?.edge.source ?? DEFAULT_SYSTEM_NODE_ID);
      setIsPlaying(play);
    },
    [includeDeploy]
  );

  useEffect(() => {
    resetTrace(isPlaying);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when deploy toggle changes
  }, [includeDeploy]);

  useEffect(() => {
    if (!isPlaying || !currentHop || queue.length === 0) return;

    setCometGeneration((n) => n + 1);
    if (!manualSelection) {
      setSelectedId(currentHop.edge.target);
    }

    const hop = currentHop;
    const timer = window.setTimeout(() => {
      const key = systemEdgeKey(hop.edge);
      setVisitedEdgeKeys((prev) => new Set([...prev, key]));
      setVisitedNodeIds((prev) => {
        const next = new Set(prev);
        next.add(hop.edge.source);
        next.add(hop.edge.target);
        return next;
      });
      setFlareNodeId(hop.edge.target);
      setFlareGeneration((n) => n + 1);

      setHopIndex((current) => {
        const nextIndex = current + 1;
        if (nextIndex >= queue.length) {
          window.setTimeout(() => {
            const first = queue[0];
            setHopIndex(0);
            setVisitedEdgeKeys(new Set());
            setVisitedNodeIds(new Set<SystemNodeId>([first?.edge.source ?? DEFAULT_SYSTEM_NODE_ID]));
            setFlareNodeId(null);
            setCometGeneration((n) => n + 1);
          }, 1200);
          return current;
        }
        return nextIndex;
      });
    }, SIGNAL_TRACE_HOP_MS);

    return () => window.clearTimeout(timer);
  }, [isPlaying, hopIndex, includeDeploy, manualSelection, queue]);

  const handleSelect = (id: SystemNodeId) => {
    setManualSelection(true);
    setSelectedId(id);
  };

  const stepForward = () => {
    if (!currentHop) return;
    setIsPlaying(false);
    const key = systemEdgeKey(currentHop.edge);
    setVisitedEdgeKeys((prev) => new Set([...prev, key]));
    setVisitedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(currentHop.edge.source);
      next.add(currentHop.edge.target);
      return next;
    });
    setFlareNodeId(currentHop.edge.target);
    setFlareGeneration((n) => n + 1);
    setCometGeneration((n) => n + 1);
    setSelectedId(currentHop.edge.target);
    setHopIndex((i) => Math.min(i + 1, queue.length - 1));
  };

  const selectedNode = SYSTEM_NODE_MAP[selectedId];
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
            <HeaderDividerBeam delay={0} className="max-w-xs" />
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-stone-500 mb-1">
                Signal Trace
              </p>
              <h1 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-stone-100">
                System Architecture
              </h1>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold tracking-widest uppercase text-stone-600">
              Hop {progressLabel}
            </p>
            {currentHop ? (
              <p className="text-[10px] font-bold tracking-widest uppercase text-amber-200/60 mt-1">
                {SIGNAL_TRACE_ACT_LABELS[currentHop.act]}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="relative flex-1 min-h-0 flex flex-col bg-black">
          <SystemMapGraph
            selectedId={selectedId}
            onSelect={handleSelect}
            activeEdgeKey={activeEdgeKey}
            visitedEdgeKeys={visitedEdgeKeys}
            visitedNodeIds={visitedNodeIds}
            flareNodeId={flareNodeId}
            flareGeneration={flareGeneration}
            cometGeneration={cometGeneration}
            includeDeploy={includeDeploy}
            activeNodeIds={activeNodeIds}
          />
        </div>

        <div className="w-full lg:w-[min(380px,32vw)] shrink-0 min-h-[280px] lg:min-h-0 border-t lg:border-t-0 lg:border-l border-white/10">
          <SystemMapDetailPanel node={selectedNode} traceHop={manualSelection ? null : currentHop ?? null} />
        </div>
      </div>

      <footer className="shrink-0 px-6 md:px-10 py-4 border-t border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <TraceControl
            label={isPlaying ? 'Pause' : 'Play'}
            onClick={() => setIsPlaying((p) => !p)}
            active={isPlaying}
          />
          <TraceControl label="Step →" onClick={stepForward} />
          <TraceControl label="Restart" onClick={() => resetTrace(true)} />
          <TraceControl
            label={includeDeploy ? 'Act 0 · On' : 'Act 0 · Deploy'}
            onClick={() => setIncludeDeploy((d) => !d)}
            active={includeDeploy}
          />
          {manualSelection ? (
            <button
              type="button"
              onClick={() => {
                setManualSelection(false);
                if (currentHop) setSelectedId(currentHop.edge.target);
              }}
              className="text-[10px] font-bold tracking-widest uppercase text-amber-200/70 hover:text-amber-200 ml-2"
            >
              Resume trace →
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
