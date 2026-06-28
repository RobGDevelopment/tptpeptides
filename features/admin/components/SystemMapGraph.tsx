'use client';

import { useMemo } from 'react';
import {
  SYSTEM_EDGES,
  SYSTEM_NODES,
  SYSTEM_NODE_MAP,
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

function nodeContainerOpacity(
  node: SystemNode,
  isSelected: boolean,
  isConnected: boolean
): string {
  if (isSelected || isConnected) return 'opacity-100';
  if (node.implementationStatus === 'planned') return 'opacity-[0.12]';
  if (node.implementationStatus === 'partial') return 'opacity-50';
  return 'opacity-100';
}

const NODE_LABEL_CLASS =
  'absolute top-full mt-2 w-32 text-center text-[10px] md:text-xs font-bold tracking-widest uppercase transition-colors left-1/2 -translate-x-1/2';

export function SystemMapGraph({ selectedId, onSelect }: SystemMapGraphProps) {
  const particles = useMemo(() => createStarfield(100), []);
  const edgeGeometries = useMemo(() => SYSTEM_EDGES.map(buildEdgeGeometry), []);

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<SystemNodeId>([selectedId]);
    for (const edge of SYSTEM_EDGES) {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    }
    return ids;
  }, [selectedId]);

  return (
    <div className="system-map-pan-canvas flex-1 min-h-0 overflow-auto">
      <div className="relative min-w-[920px] min-h-[680px] w-full h-full bg-black">
        {/* Starfield — Falconwood DataNexus particle layer */}
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
                opacity: 0.15 + (p.size / 3) * 0.25,
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

            {edgeGeometries.map(({ key, x1, y1, x2, y2 }, index) => (
              <linearGradient
                key={`comet-grad-${key}`}
                id={`comet-grad-${key}`}
                gradientUnits="userSpaceOnUse"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              >
                <stop offset="0%" stopColor="rgba(253,230,138,0)">
                  <animate
                    attributeName="offset"
                    values="-0.3;1.3"
                    dur="6s"
                    repeatCount="indefinite"
                    begin={`${index * 0.08}s`}
                  />
                </stop>
                <stop offset="0%" stopColor="rgba(255,255,255,0.9)">
                  <animate
                    attributeName="offset"
                    values="-0.1;1.5"
                    dur="6s"
                    repeatCount="indefinite"
                    begin={`${index * 0.08}s`}
                  />
                </stop>
                <stop offset="0%" stopColor="rgba(253,230,138,0)">
                  <animate
                    attributeName="offset"
                    values="0.1;1.7"
                    dur="6s"
                    repeatCount="indefinite"
                    begin={`${index * 0.08}s`}
                  />
                </stop>
              </linearGradient>
            ))}
          </defs>

          {edgeGeometries.map(({ key, d, edge }) => {
            const isSelectedEdge =
              edge.source === selectedId || edge.target === selectedId;
            const trackWidth = isSelectedEdge ? 2 : 1.5;

            return (
              <g key={key}>
                <path
                  d={d}
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth={trackWidth}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={edge.structural ? '4 6' : undefined}
                  opacity={edge.structural ? 0.35 : 0.85}
                />
                {!edge.structural ? (
                  <path
                    d={d}
                    fill="none"
                    stroke={`url(#comet-grad-${key})`}
                    strokeWidth={trackWidth}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
              </g>
            );
          })}
        </svg>

        {SYSTEM_NODES.map((node) => {
          const isSelected = node.id === selectedId;
          const isConnected = connectedNodeIds.has(node.id);

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelect(node.id)}
              className={cn(
                'absolute z-10 -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-200/40',
                nodeContainerOpacity(node, isSelected, isConnected)
              )}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              aria-pressed={isSelected}
              aria-label={`${node.label}. ${isSelected ? 'Selected' : 'Select to view telemetry'}`}
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    'w-12 h-12 md:w-16 md:h-16 rounded-full border flex items-center justify-center bg-black border-white/10 transition-all duration-300',
                    isSelected && 'border-amber-200/40 shadow-sm'
                  )}
                >
                  <div
                    className={cn(
                      'w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-300',
                      isSelected ? 'bg-amber-200/40' : 'bg-neutral-600'
                    )}
                  />
                </div>

                <span
                  className={cn(
                    NODE_LABEL_CLASS,
                    isSelected ? 'text-stone-200' : 'text-stone-500'
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
