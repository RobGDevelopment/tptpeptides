'use client';

import { useMemo } from 'react';
import {
  SYSTEM_EDGES,
  SYSTEM_NODE_MAP,
  SYSTEM_NODES,
  SYSTEM_NODE_RADIUS,
  systemEdgeKey,
  type SystemNodeId,
} from '../../../lib/admin/systemMapConfig';
import { cn } from '../../../lib/utils/cn';

interface SystemMapGraphProps {
  selectedId: SystemNodeId;
  onSelect: (id: SystemNodeId) => void;
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

/** Gentle arc for constellation paths — offset perpendicular to the chord. */
function edgePathD(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx - dy * 0.12;
  const cy = my + dx * 0.12;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function SystemMapGraph({ selectedId, onSelect }: SystemMapGraphProps) {
  const outgoingEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const edge of SYSTEM_EDGES) {
      if (edge.source === selectedId) keys.add(systemEdgeKey(edge));
    }
    return keys;
  }, [selectedId]);

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<SystemNodeId>([selectedId]);
    for (const edge of SYSTEM_EDGES) {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    }
    return ids;
  }, [selectedId]);

  return (
    <div className="system-map-constellation relative flex-1 min-h-[520px] w-full h-full">
      <div className="absolute inset-0 system-map-starfield pointer-events-none" aria-hidden />

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="constellation-beam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(191,149,63,0)" />
            <stop offset="40%" stopColor="rgba(191,149,63,0.2)" />
            <stop offset="50%" stopColor="rgba(255,235,190,0.95)" />
            <stop offset="60%" stopColor="rgba(191,149,63,0.2)" />
            <stop offset="100%" stopColor="rgba(191,149,63,0)" />
          </linearGradient>
          <filter id="constellation-beam-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.35" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {SYSTEM_EDGES.map((edge) => {
          const from = SYSTEM_NODE_MAP[edge.source];
          const to = SYSTEM_NODE_MAP[edge.target];
          const trimmed = trimEdgeEndpoints(from.x, from.y, to.x, to.y, SYSTEM_NODE_RADIUS);
          const d = edgePathD(trimmed.x1, trimmed.y1, trimmed.x2, trimmed.y2);
          const key = systemEdgeKey(edge);
          const isOutgoing = outgoingEdgeKeys.has(key);
          const isConnected =
            edge.source === selectedId ||
            edge.target === selectedId ||
            outgoingEdgeKeys.has(key);

          return (
            <g key={key}>
              <path
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={0.15}
                vectorEffect="non-scaling-stroke"
                style={{ opacity: isConnected ? 0.5 : 0.25 }}
              />
              <path
                d={d}
                fill="none"
                stroke="url(#constellation-beam)"
                strokeWidth={isOutgoing ? 0.45 : 0.28}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter={isOutgoing ? 'url(#constellation-beam-glow)' : undefined}
                pathLength={100}
                className={cn(
                  'system-map-constellation-beam',
                  isOutgoing
                    ? 'system-map-constellation-beam-active'
                    : isConnected
                      ? 'system-map-constellation-beam-connected'
                      : 'system-map-constellation-beam-idle'
                )}
                style={{ opacity: isOutgoing ? 1 : isConnected ? 0.55 : 0.22 }}
              />
            </g>
          );
        })}
      </svg>

      {SYSTEM_NODES.map((node) => {
        const isSelected = node.id === selectedId;
        const isConnected = connectedNodeIds.has(node.id);
        const dimmed = !isSelected && !isConnected;

        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            className={cn(
              'absolute z-10 flex flex-col items-center gap-2.5 -translate-x-1/2 -translate-y-1/2',
              'transition-all duration-300 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/50',
              dimmed && 'opacity-35 scale-[0.96]',
              isConnected && !isSelected && 'opacity-80'
            )}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            aria-pressed={isSelected}
            aria-label={`${node.label}. ${isSelected ? 'Selected' : 'Select to view telemetry'}`}
          >
            {isSelected ? (
              <span
                className="absolute w-20 h-20 rounded-full system-map-node-halo pointer-events-none"
                aria-hidden
              />
            ) : null}

            <span
              className={cn(
                'relative flex items-center justify-center w-[3.25rem] h-[3.25rem] rounded-full border transition-all duration-300',
                isSelected
                  ? 'system-map-node-selected border-gold bg-[#1a1610]'
                  : isConnected
                    ? 'border-gold/45 bg-[#121212]'
                    : 'border-white/20 bg-[#0c0c0c]'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full transition-colors duration-300',
                  isSelected ? 'bg-gold shadow-[0_0_10px_rgba(191,149,63,0.8)]' : isConnected ? 'bg-gold/70' : 'bg-white/30'
                )}
              />
            </span>

            <span
              className={cn(
                'text-[9px] sm:text-[10px] tracking-caps uppercase font-medium whitespace-nowrap transition-colors duration-300',
                isSelected ? 'text-gold-light' : isConnected ? 'text-secondary' : 'text-muted'
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
