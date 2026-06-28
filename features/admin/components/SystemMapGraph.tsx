'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BEAM_TRAVEL_MS,
  BEAM_TRAVEL_S,
  SYSTEM_EDGES,
  SYSTEM_NODE_MAP,
  SYSTEM_NODES,
  SYSTEM_NODE_RADIUS,
  SYSTEM_TELEMETRY_SEQUENCE,
  edgesMatch,
  systemEdgeKey,
  type SystemEdge,
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
  const cx = mx - dy * 0.12;
  const cy = my + dx * 0.12;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function buildEdgeGeometry(edge: SystemEdge): EdgeGeometry {
  const from = SYSTEM_NODE_MAP[edge.source];
  const to = SYSTEM_NODE_MAP[edge.target];
  const trimmed = trimEdgeEndpoints(from.x, from.y, to.x, to.y, SYSTEM_NODE_RADIUS);
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

export function SystemMapGraph({ selectedId, onSelect }: SystemMapGraphProps) {
  const [hopIndex, setHopIndex] = useState(0);
  const [flareNodeId, setFlareNodeId] = useState<SystemNodeId | null>('storefront');
  const [flareGeneration, setFlareGeneration] = useState(0);

  const edgeGeometries = useMemo(() => SYSTEM_EDGES.map(buildEdgeGeometry), []);

  const activeHop = SYSTEM_TELEMETRY_SEQUENCE[hopIndex] ?? SYSTEM_TELEMETRY_SEQUENCE[0]!;
  const activeEdgeKey = systemEdgeKey(activeHop);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHopIndex((current) => {
        const hop = SYSTEM_TELEMETRY_SEQUENCE[current]!;
        setFlareNodeId(hop.target);
        setFlareGeneration((n) => n + 1);
        return (current + 1) % SYSTEM_TELEMETRY_SEQUENCE.length;
      });
    }, BEAM_TRAVEL_MS);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setHopIndex(0);
    setFlareNodeId(SYSTEM_TELEMETRY_SEQUENCE[0]!.source);
    setFlareGeneration((n) => n + 1);
  }, []);

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<SystemNodeId>([selectedId]);
    for (const edge of SYSTEM_EDGES) {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    }
    for (const edge of SYSTEM_TELEMETRY_SEQUENCE) {
      if (edge.source === activeHop.source || edge.target === activeHop.target) {
        ids.add(edge.source);
        ids.add(edge.target);
      }
    }
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
    <div
      className="system-map-constellation relative flex-1 min-h-[520px] w-full h-full bg-[#050505]"
      style={{ '--beam-travel-s': `${BEAM_TRAVEL_S}s` } as React.CSSProperties}
    >
      <div className="absolute inset-0 system-map-starfield pointer-events-none opacity-20" aria-hidden />
      <div className="absolute inset-0 system-map-void-glow pointer-events-none" aria-hidden />

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
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
              <stop offset="55%" stopColor="rgba(255,215,0,0.08)" />
              <stop offset="82%" stopColor="rgba(255,215,0,0.45)" />
              <stop offset="100%" stopColor="#FFD700" />
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
          const onLivePath = SYSTEM_TELEMETRY_SEQUENCE.some((hop) => edgesMatch(hop, edge));

          return (
            <g key={key}>
              <path
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={0.12}
                vectorEffect="non-scaling-stroke"
                className="opacity-20"
              />
              {isActiveHop ? (
                <>
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(255,215,0,0.12)"
                    strokeWidth={0.55}
                    vectorEffect="non-scaling-stroke"
                    filter="url(#comet-bloom)"
                  />
                  <path
                    key={`comet-${hopIndex}-${flareGeneration}`}
                    d={d}
                    fill="none"
                    stroke={`url(#comet-grad-${key})`}
                    strokeWidth={0.42}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    pathLength={100}
                    className="system-map-comet-beam"
                    style={{ animationDuration: `${BEAM_TRAVEL_S}s` }}
                  />
                </>
              ) : null}
              {isSelectedOutgoing && !isActiveHop ? (
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(255,215,0,0.18)"
                  strokeWidth={0.22}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={100}
                  className="system-map-comet-beam-dim"
                />
              ) : null}
              {!isActiveHop && onLivePath ? (
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={0.1}
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
        const dimmed = !isSelected && !isConnected && !isOnActiveHop;
        const showFlare = flareNodeId === node.id;

        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            className={cn(
              'absolute z-10 flex flex-col items-center gap-2.5 -translate-x-1/2 -translate-y-1/2',
              'transition-[opacity,transform] duration-500 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/60',
              dimmed && 'opacity-[0.18]',
              !isSelected && isConnected && 'opacity-50',
              isOnActiveHop && !isSelected && 'opacity-75'
            )}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            aria-pressed={isSelected}
            aria-label={`${node.label}. ${isSelected ? 'Selected' : 'Select to view telemetry'}`}
          >
            <span className="relative flex items-center justify-center w-[3.5rem] h-[3.5rem]">
              {showFlare ? (
                <span
                  key={`flare-${node.id}-${flareGeneration}`}
                  className="system-map-hit-flare absolute inset-0 rounded-full border-2 border-gold pointer-events-none"
                  aria-hidden
                />
              ) : null}

              {isSelected ? (
                <span
                  className="absolute inset-[-10px] rounded-full pointer-events-none system-map-node-aura"
                  aria-hidden
                />
              ) : null}

              <span
                className={cn(
                  'relative flex items-center justify-center w-full h-full rounded-full border-2 transition-all duration-300',
                  isSelected
                    ? 'system-map-node-lit border-[#FFD700] bg-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.6),0_0_40px_rgba(255,215,0,0.25)]'
                    : isOnActiveHop
                      ? 'border-gold/35 bg-transparent'
                      : 'border-white/12 bg-transparent'
                )}
              >
                <span
                  className={cn(
                    'rounded-full transition-all duration-300',
                    isSelected
                      ? 'w-3 h-3 bg-[#FFF8E0] shadow-[0_0_12px_rgba(255,255,255,0.9)]'
                      : isOnActiveHop
                        ? 'w-1.5 h-1.5 bg-gold/60'
                        : 'w-1 h-1 bg-white/20'
                  )}
                />
              </span>
            </span>

            <span
              className={cn(
                'text-[9px] sm:text-[10px] tracking-caps uppercase font-medium whitespace-nowrap transition-colors duration-300',
                isSelected
                  ? 'text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                  : isOnActiveHop
                    ? 'text-gold/70'
                    : 'text-white/25'
              )}
            >
              {node.graphLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
