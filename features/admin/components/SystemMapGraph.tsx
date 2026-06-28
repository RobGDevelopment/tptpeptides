'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  SYSTEM_NODES,
  SYSTEM_NODE_MAP,
  getConnectedNodeIds,
  getTracePosition,
  nodeRadiusFor,
  systemEdgeKey,
  type SystemNodeId,
} from '../../../lib/admin/systemMapConfig';
import { cn } from '../../../lib/utils/cn';

export type MapInteractionMode = 'journey' | 'explore';

interface SystemMapGraphProps {
  selectedId: SystemNodeId | null;
  onSelect: (id: SystemNodeId) => void;
  mode: MapInteractionMode;
  /** During guided journey — the upstream node we just arrived from. */
  journeyFromId?: SystemNodeId | null;
}

interface BeamGeometry {
  key: string;
  neighborId: SystemNodeId;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isJourneyPath: boolean;
}

const SHUTTLE_DUR = '3.5s';
const JOURNEY_SHUTTLE_DUR = '2.8s';

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function trimEdgeEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  inset: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: x1 + ux * inset,
    y1: y1 + uy * inset,
    x2: x2 - ux * inset,
    y2: y2 - uy * inset,
  };
}

function edgePathD(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const curve = Math.min(dist * 0.12, 3.5);
  const cx = mx - (dy / dist) * curve;
  const cy = my + (dx / dist) * curve;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function CometShuttleStops({ dur }: { dur: string }) {
  return (
    <>
      <stop stopColor="rgba(253,230,138,0)">
        <animate
          attributeName="offset"
          values="-0.2; 1.2; -0.2"
          dur={dur}
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0; 0.5; 1"
          keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
        />
      </stop>
      <stop stopColor="rgba(255,255,255,0.9)">
        <animate
          attributeName="offset"
          values="-0.1; 1.3; -0.1"
          dur={dur}
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0; 0.5; 1"
          keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
        />
      </stop>
      <stop stopColor="rgba(253,230,138,0)">
        <animate
          attributeName="offset"
          values="0; 1.4; 0"
          dur={dur}
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0; 0.5; 1"
          keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
        />
      </stop>
    </>
  );
}

const NODE_LABEL_CLASS =
  'absolute top-full mt-2 w-32 text-center text-[10px] md:text-xs font-bold tracking-widest uppercase transition-all duration-300 left-1/2 -translate-x-1/2';

export function SystemMapGraph({
  selectedId,
  onSelect,
  mode,
  journeyFromId = null,
}: SystemMapGraphProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const particles = useMemo(
    () =>
      Array.from({ length: 100 }, (_, i) => ({
        id: i,
        x: seededRandom(i * 1.1) * 100,
        y: seededRandom(i * 2.3) * 100,
        speed: 0.5 + seededRandom(i * 4.1) * 2,
        size: seededRandom(i * 3.7) * 2,
      })),
    []
  );

  const connectedIds = useMemo(
    () => (selectedId ? new Set(getConnectedNodeIds(selectedId)) : new Set<SystemNodeId>()),
    [selectedId]
  );

  const activeBeams = useMemo((): BeamGeometry[] => {
    if (!selectedId) return [];

    const selected = SYSTEM_NODE_MAP[selectedId];
    const fromPos = getTracePosition(selected.id);
    const fromInset = nodeRadiusFor(selected);

    return getConnectedNodeIds(selectedId).map((neighborId) => {
      const neighbor = SYSTEM_NODE_MAP[neighborId];
      const toPos = getTracePosition(neighbor.id);
      const trimmed = trimEdgeEndpoints(
        fromPos.x,
        fromPos.y,
        toPos.x,
        toPos.y,
        (fromInset + nodeRadiusFor(neighbor)) / 2
      );
      const edge = { source: selectedId, target: neighborId };
      return {
        key: systemEdgeKey(edge),
        neighborId,
        d: edgePathD(trimmed.x1, trimmed.y1, trimmed.x2, trimmed.y2),
        x1: trimmed.x1,
        y1: trimmed.y1,
        x2: trimmed.x2,
        y2: trimmed.y2,
        isJourneyPath: journeyFromId !== null && neighborId === journeyFromId,
      };
    });
  }, [selectedId, journeyFromId]);

  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-system-map-node="${selectedId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [selectedId, mode]);

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
      <div className="relative min-w-[1100px] min-h-full w-full h-full bg-black">
        <div className="absolute inset-0 z-0 opacity-40 overflow-hidden pointer-events-none" aria-hidden>
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute bg-white rounded-full animate-pulse"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.speed * 5}s`,
              }}
            />
          ))}
        </div>

        {selectedId && activeBeams.length > 0 ? (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              {activeBeams.map(({ key, x1, y1, x2, y2, isJourneyPath }) => (
                <linearGradient
                  key={key}
                  id={`shuttle-${key}`}
                  gradientUnits="userSpaceOnUse"
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                >
                  <CometShuttleStops dur={isJourneyPath ? JOURNEY_SHUTTLE_DUR : SHUTTLE_DUR} />
                </linearGradient>
              ))}
            </defs>

            {activeBeams.map(({ key, d, isJourneyPath }) => (
              <path
                key={key}
                d={d}
                fill="none"
                stroke={`url(#shuttle-${key})`}
                strokeWidth={isJourneyPath ? 3.2 : 2.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={isJourneyPath ? 1 : 0.65}
              />
            ))}
          </svg>
        ) : null}

        {SYSTEM_NODES.map((node) => {
          const pos = getTracePosition(node.id);
          const isSelected = node.id === selectedId;
          const isConnected = connectedIds.has(node.id);
          const isJourneyFrom = journeyFromId === node.id && mode === 'journey';
          const isPlanned = node.implementationStatus === 'planned';
          const hasSelection = selectedId !== null;
          const isLit = isSelected || isConnected;

          const nodeOpacity = (() => {
            if (!hasSelection) return 'opacity-[0.82]';
            if (isSelected || isConnected) return 'opacity-100';
            if (isPlanned) return 'opacity-[0.45]';
            return 'opacity-[0.5]';
          })();

          return (
            <button
              key={node.id}
              type="button"
              data-system-map-node={node.id}
              onClick={() => onSelect(node.id)}
              className={cn(
                'absolute z-10 -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-200/40 transition-all duration-500',
                nodeOpacity
              )}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              aria-pressed={isSelected}
              aria-label={`${node.label}. ${isSelected ? 'Selected' : 'Select to view telemetry'}`}
            >
              <div className="relative flex flex-col items-center">
                {isSelected ? (
                  <span
                    className={cn(
                      'absolute inset-0 m-auto w-14 h-14 md:w-[4.5rem] md:h-[4.5rem] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(253,230,138,0.28)_0%,transparent_70%)]',
                      mode === 'journey' && 'animate-pulse'
                    )}
                    aria-hidden
                  />
                ) : null}

                {(isConnected || isJourneyFrom) && !isSelected ? (
                  <span
                    className={cn(
                      'absolute inset-0 m-auto w-14 h-14 md:w-[4.25rem] md:h-[4.25rem] rounded-full pointer-events-none',
                      isJourneyFrom
                        ? 'bg-[radial-gradient(circle,rgba(253,230,138,0.22)_0%,transparent_70%)]'
                        : 'bg-[radial-gradient(circle,rgba(253,230,138,0.14)_0%,transparent_70%)] system-map-node-breathe-glow'
                    )}
                    aria-hidden
                  />
                ) : null}

                <div
                  className={cn(
                    'relative w-12 h-12 md:w-16 md:h-16 rounded-full border flex items-center justify-center bg-black transition-all duration-300 ease-in-out',
                    isPlanned ? 'border-dotted border-white/25' : 'border-white/10',
                    isSelected && 'border-amber-200/50 shadow-[0_0_20px_rgba(253,230,138,0.3)]',
                    isJourneyFrom && 'border-amber-200/45 shadow-sm',
                    isConnected && !isSelected && !isJourneyFrom && 'border-amber-200/35 shadow-sm',
                    (isConnected || isJourneyFrom) && !isSelected && 'system-map-node-breathe'
                  )}
                >
                  <div
                    className={cn(
                      'w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-300 ease-in-out',
                      isSelected && 'bg-amber-200/50 shadow-[0_0_12px_rgba(255,255,255,0.5)]',
                      isJourneyFrom && !isSelected && 'bg-amber-200/45',
                      isConnected && !isSelected && !isJourneyFrom && 'bg-amber-200/40 system-map-dot-breathe',
                      !isLit && (isPlanned ? 'bg-neutral-700' : 'bg-neutral-600')
                    )}
                  />
                </div>

                <span
                  className={cn(
                    NODE_LABEL_CLASS,
                    isSelected
                      ? 'text-stone-100'
                      : isJourneyFrom
                        ? 'text-amber-200/80'
                        : isConnected
                          ? 'text-stone-300'
                          : isPlanned
                            ? 'text-stone-600'
                            : 'text-stone-500'
                  )}
                >
                  <span className="md:hidden">{node.graphLabelShort ?? node.graphLabel}</span>
                  <span className="hidden md:inline">{node.graphLabel}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
