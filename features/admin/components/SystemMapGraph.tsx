'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  SYSTEM_EDGES,
  SYSTEM_MAP_ZONES,
  SYSTEM_NODES,
  SYSTEM_NODE_MAP,
  buildPlaybackQueue,
  getLoopById,
  nodeRadiusFor,
  systemEdgeKey,
  type SystemEdge,
  type SystemNode,
  type SystemNodeId,
} from '../../../lib/admin/systemMapConfig';
import { cn } from '../../../lib/utils/cn';

interface SystemMapGraphProps {
  selectedId: SystemNodeId;
  onSelect: (id: SystemNodeId) => void;
}

interface EdgeGeometry {
  key: string;
  edge: SystemEdge;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const NODE_SIZE_CLASS: Record<NonNullable<SystemNode['size']>, string> = {
  sm: 'w-[2.6rem] h-[2.6rem]',
  md: 'w-[3.5rem] h-[3.5rem]',
  lg: 'w-[4rem] h-[4rem]',
};

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
  const cx = mx - dy * 0.18;
  const cy = my + dx * 0.18;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function buildEdgeGeometry(edge: SystemEdge): EdgeGeometry {
  const from = SYSTEM_NODE_MAP[edge.source];
  const to = SYSTEM_NODE_MAP[edge.target];
  const inset = (nodeRadiusFor(from) + nodeRadiusFor(to)) / 2;
  const trimmed = trimEdgeEndpoints(from.x, from.y, to.x, to.y, inset);
  return {
    key: systemEdgeKey(edge),
    edge,
    d: edgePathD(trimmed.x1, trimmed.y1, trimmed.x2, trimmed.y2),
    x1: trimmed.x1,
    y1: trimmed.y1,
    x2: trimmed.x2,
    y2: trimmed.y2,
  };
}

function nodeOpacityClass(
  node: SystemNode,
  isSelected: boolean,
  isConnected: boolean,
  isOnActiveHop: boolean
): string {
  if (isSelected) return 'opacity-100';
  if (isOnActiveHop) return 'opacity-75';
  if (isConnected) return 'opacity-50';
  if (node.implementationStatus === 'planned') return 'opacity-[0.12]';
  if (node.implementationStatus === 'partial') return 'opacity-40';
  return 'opacity-[0.14]';
}

export function SystemMapGraph({ selectedId, onSelect }: SystemMapGraphProps) {
  const playbackQueue = useMemo(() => buildPlaybackQueue(), []);
  const [queueIndex, setQueueIndex] = useState(0);
  const [flareNodeId, setFlareNodeId] = useState<SystemNodeId | null>(
    playbackQueue[0]?.edge.source ?? 'storefront-cms'
  );
  const [flareGeneration, setFlareGeneration] = useState(0);
  const [cometGeneration, setCometGeneration] = useState(0);

  const activeItem = playbackQueue[queueIndex] ?? playbackQueue[0]!;
  const activeHop = activeItem.edge;
  const activeEdgeKey = systemEdgeKey(activeHop);
  const activeLoop = getLoopById(activeItem.loopId);
  const hopDurationS = activeLoop.hopIntervalMs / 1000;

  useEffect(() => {
    let cancelled = false;
    let index = 0;
    let timeoutId = 0;

    const scheduleNext = (delayMs: number) => {
      timeoutId = window.setTimeout(runHop, delayMs);
    };

    const runHop = () => {
      if (cancelled) return;
      const item = playbackQueue[index]!;
      setQueueIndex(index);
      setFlareNodeId(item.edge.target);
      setFlareGeneration((n) => n + 1);
      setCometGeneration((n) => n + 1);
      const interval = getLoopById(item.loopId).hopIntervalMs;
      index = (index + 1) % playbackQueue.length;
      scheduleNext(interval);
    };

    setFlareNodeId(playbackQueue[0]!.edge.source);
    scheduleNext(getLoopById(playbackQueue[0]!.loopId).hopIntervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [playbackQueue]);

  const edgeGeometries = useMemo(() => SYSTEM_EDGES.map(buildEdgeGeometry), []);

  const animatedEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of playbackQueue) {
      keys.add(systemEdgeKey(item.edge));
    }
    return keys;
  }, [playbackQueue]);

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<SystemNodeId>([selectedId]);
    for (const edge of SYSTEM_EDGES) {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    }
    ids.add(activeHop.source);
    ids.add(activeHop.target);
    return ids;
  }, [selectedId, activeHop]);

  const outgoingFromSelected = useMemo(() => {
    const keys = new Set<string>();
    for (const edge of SYSTEM_EDGES) {
      if (edge.source === selectedId) keys.add(systemEdgeKey(edge));
    }
    return keys;
  }, [selectedId]);

  return (
    <div className="system-map-pan-canvas flex-1 min-h-0 overflow-auto">
      <div
        className="system-map-constellation relative min-w-[920px] min-h-[680px] w-full h-full bg-[#050505]"
        style={{ '--beam-travel-s': `${hopDurationS}s` } as React.CSSProperties}
      >
        <div className="absolute inset-0 system-map-starfield pointer-events-none opacity-20" aria-hidden />
        <div className="absolute inset-0 system-map-void-glow pointer-events-none" aria-hidden />

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {SYSTEM_MAP_ZONES.map((zone) => (
            <g key={zone.id}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                rx={0.8}
                fill="rgba(255,255,255,0.015)"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.08}
              />
              <text
                x={zone.x + 1.2}
                y={zone.y + 2.8}
                fill="rgba(255,255,255,0.12)"
                fontSize={1.6}
                fontFamily="system-ui, sans-serif"
                letterSpacing="0.12em"
              >
                {zone.label.toUpperCase()}
              </text>
            </g>
          ))}

          <defs>
            {edgeGeometries.map(({ key, x1, y1, x2, y2 }) => (
              <linearGradient
                key={`grad-${key}`}
                id={`comet-grad-${key}`}
                gradientUnits="userSpaceOnUse"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              >
                <stop offset="0%" stopColor="rgba(255,215,0,0)" />
                <stop offset="50%" stopColor="rgba(255,215,0,0.06)" />
                <stop offset="78%" stopColor="rgba(255,215,0,0.35)" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>
            ))}
            {edgeGeometries.map(({ key, x1, y1, x2, y2 }) => (
              <linearGradient
                key={`grad-dim-${key}`}
                id={`comet-grad-dim-${key}`}
                gradientUnits="userSpaceOnUse"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              >
                <stop offset="0%" stopColor="rgba(255,215,0,0)" />
                <stop offset="100%" stopColor="rgba(255,215,0,0.35)" />
              </linearGradient>
            ))}
            <filter id="comet-bloom" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="0.55" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {edgeGeometries.map(({ key, d, edge }) => {
            const isActiveHop = key === activeEdgeKey;
            const isSelectedOutgoing = outgoingFromSelected.has(key);
            const onLivePath = animatedEdgeKeys.has(key);
            const isStructuralOnly = edge.structural === true;
            const isDimmedComet = isActiveHop && activeItem.dimmed;

            return (
              <g key={key}>
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={isStructuralOnly ? 0.08 : 0.12}
                  strokeDasharray={isStructuralOnly ? '0.4 0.6' : undefined}
                  vectorEffect="non-scaling-stroke"
                  className="opacity-20"
                />
                {isActiveHop ? (
                  <>
                    <path
                      d={d}
                      fill="none"
                      stroke="rgba(255,215,0,0.1)"
                      strokeWidth={0.55}
                      vectorEffect="non-scaling-stroke"
                      filter="url(#comet-bloom)"
                      className={cn(isDimmedComet && 'opacity-25')}
                    />
                    <path
                      key={`comet-${queueIndex}-${cometGeneration}`}
                      d={d}
                      fill="none"
                      stroke={`url(#comet-grad-${isDimmedComet ? `dim-${key}` : key})`}
                      strokeWidth={isDimmedComet ? 0.28 : 0.42}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      pathLength={100}
                      className={cn(
                        'system-map-comet-beam',
                        isDimmedComet && 'system-map-comet-beam-dimmed'
                      )}
                      style={{ animationDuration: `${hopDurationS}s` }}
                    />
                  </>
                ) : null}
                {isSelectedOutgoing && !isActiveHop ? (
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(255,215,0,0.15)"
                    strokeWidth={0.18}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    pathLength={100}
                    className="system-map-comet-beam-dim"
                  />
                ) : null}
                {!isActiveHop && onLivePath && !isStructuralOnly ? (
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.08}
                    vectorEffect="non-scaling-stroke"
                    className="opacity-20"
                  />
                ) : null}
              </g>
            );
          })}
        </svg>

        {SYSTEM_NODES.map((node) => {
          const isSelected = node.id === selectedId;
          const isConnected = connectedNodeIds.has(node.id);
          const isOnActiveHop =
            node.id === activeHop.source || node.id === activeHop.target;
          const showFlare = flareNodeId === node.id;
          const sizeClass = NODE_SIZE_CLASS[node.size ?? 'md'];

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelect(node.id)}
              className={cn(
                'absolute z-10 flex flex-col items-center gap-2 -translate-x-1/2 -translate-y-1/2',
                'transition-[opacity,transform] duration-500 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/60',
                nodeOpacityClass(node, isSelected, isConnected, isOnActiveHop)
              )}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              aria-pressed={isSelected}
              aria-label={`${node.label}. ${isSelected ? 'Selected' : 'Select to view telemetry'}`}
            >
              <span className={cn('relative flex items-center justify-center', sizeClass)}>
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {showFlare ? (
                    <span
                      key={`flare-${node.id}-${flareGeneration}`}
                      className="system-map-hit-flare animate-pulse-flare absolute inset-0 rounded-full border-2 border-[#FFD700] pointer-events-none"
                      aria-hidden
                    />
                  ) : null}
                </span>

                {isSelected ? (
                  <span
                    className="absolute inset-[-12px] rounded-full pointer-events-none system-map-node-aura"
                    aria-hidden
                  />
                ) : null}

                <span
                  className={cn(
                    'relative flex items-center justify-center w-full h-full rounded-full border transition-all duration-300 bg-transparent',
                    isSelected
                      ? 'system-map-node-lit border-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.5)]'
                      : isOnActiveHop
                        ? 'border-gold/30'
                        : node.implementationStatus === 'planned'
                          ? 'border-white/10 border-dotted'
                          : node.implementationStatus === 'partial'
                            ? 'border-white/15 border-dashed'
                            : 'border-white/10'
                  )}
                >
                  <span
                    className={cn(
                      'rounded-full transition-all duration-300',
                      isSelected
                        ? 'w-3 h-3 bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.8)]'
                        : isOnActiveHop
                          ? 'w-1.5 h-1.5 bg-gold/50'
                          : 'w-1 h-1 bg-white/20'
                    )}
                  />
                </span>
              </span>

              <span
                className={cn(
                  'text-[8px] sm:text-[9px] tracking-caps uppercase font-medium whitespace-nowrap transition-colors duration-300 max-w-[5.5rem] sm:max-w-none truncate sm:overflow-visible',
                  isSelected
                    ? 'text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                    : isOnActiveHop
                      ? 'text-gold/60'
                      : 'text-white/20'
                )}
              >
                <span className="sm:hidden">{node.graphLabelShort ?? node.graphLabel}</span>
                <span className="hidden sm:inline">{node.graphLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
