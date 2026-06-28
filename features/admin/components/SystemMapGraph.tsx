'use client';

import { useMemo } from 'react';
import {
  SIGNAL_TRACE_HOP_MS,
  SYSTEM_NODES,
  SYSTEM_NODE_MAP,
  buildSignalTraceQueue,
  getTracePosition,
  nodeRadiusFor,
  systemEdgeKey,
  type SystemEdge,
  type SystemNodeId,
} from '../../../lib/admin/systemMapConfig';
import { cn } from '../../../lib/utils/cn';

interface SystemMapGraphProps {
  selectedId: SystemNodeId;
  onSelect: (id: SystemNodeId) => void;
  activeEdgeKey: string | null;
  visitedEdgeKeys: ReadonlySet<string>;
  visitedNodeIds: ReadonlySet<SystemNodeId>;
  flareNodeId: SystemNodeId | null;
  flareGeneration: number;
  cometGeneration: number;
  includeDeploy: boolean;
  activeNodeIds: ReadonlySet<SystemNodeId>;
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

interface StarParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function createStarfield(count: number): StarParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: seededRandom(i * 1.1) * 100,
    y: seededRandom(i * 2.3) * 100,
    size: seededRandom(i * 3.7) * 2 + 1,
    speed: seededRandom(i * 4.1) * 3 + 2,
  }));
}

function nodePos(id: SystemNodeId): { x: number; y: number } {
  return getTracePosition(id);
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
  const dist = Math.hypot(dx, dy);
  const curve = Math.min(dist * 0.14, 4);
  const cx = mx - (dy / dist) * curve;
  const cy = my + (dx / dist) * curve;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function buildEdgeGeometry(edge: SystemEdge): EdgeGeometry {
  const from = SYSTEM_NODE_MAP[edge.source];
  const to = SYSTEM_NODE_MAP[edge.target];
  const fromPos = nodePos(from.id);
  const toPos = nodePos(to.id);
  const inset = (nodeRadiusFor(from) + nodeRadiusFor(to)) / 2;
  const trimmed = trimEdgeEndpoints(fromPos.x, fromPos.y, toPos.x, toPos.y, inset);
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

const NODE_LABEL_CLASS =
  'absolute top-full mt-2 w-32 text-center text-[10px] md:text-xs font-bold tracking-widest uppercase transition-colors left-1/2 -translate-x-1/2';

const COMET_DUR_S = SIGNAL_TRACE_HOP_MS / 1000;

export function SystemMapGraph({
  selectedId,
  onSelect,
  activeEdgeKey,
  visitedEdgeKeys,
  visitedNodeIds,
  flareNodeId,
  flareGeneration,
  cometGeneration,
  includeDeploy,
  activeNodeIds,
}: SystemMapGraphProps) {
  const particles = useMemo(() => createStarfield(100), []);

  const edgeGeometries = useMemo(() => {
    const seen = new Set<string>();
    const geometries: EdgeGeometry[] = [];
    for (const hop of buildSignalTraceQueue(includeDeploy)) {
      const key = systemEdgeKey(hop.edge);
      if (seen.has(key)) continue;
      seen.add(key);
      geometries.push(buildEdgeGeometry(hop.edge));
    }
    return geometries;
  }, [includeDeploy]);

  const activeGeometry = edgeGeometries.find((g) => g.key === activeEdgeKey) ?? null;

  const narrativeNodeIds = useMemo(() => {
    const ids = new Set<SystemNodeId>();
    for (const hop of buildSignalTraceQueue(includeDeploy)) {
      ids.add(hop.edge.source);
      ids.add(hop.edge.target);
    }
    return ids;
  }, [includeDeploy]);

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="relative min-w-[1100px] min-h-full w-full h-full bg-black">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute bg-white rounded-full animate-pulse"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                animationDuration: `${p.speed}s`,
                animationDelay: `${(p.id % 10) * 0.35}s`,
                opacity: 0.12 + (p.size / 3) * 0.2,
              }}
            />
          ))}
        </div>

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#57534e" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="lineGradVisited" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#78716c" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            {activeGeometry ? (
              <linearGradient
                key={`comet-${activeGeometry.key}-${cometGeneration}`}
                id="comet-active"
                gradientUnits="userSpaceOnUse"
                x1={activeGeometry.x1}
                y1={activeGeometry.y1}
                x2={activeGeometry.x2}
                y2={activeGeometry.y2}
              >
                <stop offset="0%" stopColor="rgba(253,230,138,0)">
                  <animate
                    attributeName="offset"
                    values="-0.3;1.3"
                    dur={`${COMET_DUR_S}s`}
                    repeatCount={1}
                  />
                </stop>
                <stop offset="0%" stopColor="rgba(255,255,255,0.9)">
                  <animate
                    attributeName="offset"
                    values="-0.1;1.5"
                    dur={`${COMET_DUR_S}s`}
                    repeatCount={1}
                  />
                </stop>
                <stop offset="0%" stopColor="rgba(253,230,138,0)">
                  <animate
                    attributeName="offset"
                    values="0.1;1.7"
                    dur={`${COMET_DUR_S}s`}
                    repeatCount={1}
                  />
                </stop>
              </linearGradient>
            ) : null}
          </defs>

          {/* Spine guide */}
          <line
            x1={2}
            y1={48}
            x2={98}
            y2={48}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.15}
            vectorEffect="non-scaling-stroke"
          />

          {edgeGeometries.map(({ key, d }) => {
            const isActive = key === activeEdgeKey;
            const isVisited = visitedEdgeKeys.has(key);
            const trackWidth = isActive || isVisited ? 2 : 1.5;

            return (
              <g key={key}>
                <path
                  d={d}
                  fill="none"
                  stroke={isVisited ? 'url(#lineGradVisited)' : 'url(#lineGrad)'}
                  strokeWidth={trackWidth}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={isVisited || isActive ? 0.9 : 0.15}
                />
                {isActive && activeGeometry ? (
                  <path
                    key={`beam-${cometGeneration}`}
                    d={d}
                    fill="none"
                    stroke="url(#comet-active)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
              </g>
            );
          })}
        </svg>

        {SYSTEM_NODES.map((node) => {
          const pos = nodePos(node.id);
          const isSelected = node.id === selectedId;
          const isVisited = visitedNodeIds.has(node.id);
          const isActive = activeNodeIds.has(node.id);
          const onNarrative = narrativeNodeIds.has(node.id);
          const showFlare = flareNodeId === node.id;

          const nodeOpacity = (() => {
            if (isSelected || isActive) return 'opacity-100';
            if (isVisited) return 'opacity-90';
            if (!onNarrative) {
              if (node.implementationStatus === 'planned') return 'opacity-[0.12]';
              return 'opacity-[0.2]';
            }
            if (node.implementationStatus === 'planned') return 'opacity-[0.12]';
            return 'opacity-35';
          })();

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelect(node.id)}
              className={cn(
                'absolute z-10 -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-200/40 transition-opacity duration-500',
                nodeOpacity
              )}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              aria-pressed={isSelected}
              aria-label={`${node.label}. ${isSelected ? 'Selected' : 'Select to view telemetry'}`}
            >
              <div className="relative flex flex-col items-center">
                {showFlare ? (
                  <span
                    key={`flare-${node.id}-${flareGeneration}`}
                    className="system-map-hit-flare animate-pulse-flare absolute inset-0 m-auto w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-amber-200/60 pointer-events-none"
                    aria-hidden
                  />
                ) : null}

                <div
                  className={cn(
                    'w-12 h-12 md:w-16 md:h-16 rounded-full border flex items-center justify-center bg-black border-white/10 transition-all duration-300',
                    (isSelected || isActive) && 'border-amber-200/40 shadow-sm',
                    isVisited && !isSelected && !isActive && 'border-amber-200/20'
                  )}
                >
                  <div
                    className={cn(
                      'w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-300',
                      isSelected || isActive
                        ? 'bg-amber-200/40'
                        : isVisited
                          ? 'bg-amber-200/25'
                          : 'bg-neutral-600'
                    )}
                  />
                </div>

                <span
                  className={cn(
                    NODE_LABEL_CLASS,
                    isSelected || isActive ? 'text-stone-200' : isVisited ? 'text-stone-400' : 'text-stone-500'
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
