'use client';

import { useMemo } from 'react';
import {
  SYSTEM_MAP_EDGES,
  SYSTEM_MAP_NODE_MAP,
  SYSTEM_MAP_NODES,
  type SystemMapNodeId,
} from '../../../lib/data/systemMapNodes';
import { cn } from '../../../lib/utils/cn';

const VIEWBOX = { width: 1000, height: 520 };
const NODE_R = 28;

interface SystemMapGraphProps {
  selectedId: SystemMapNodeId;
  onSelect: (id: SystemMapNodeId) => void;
}

function edgePath(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = toX - fromX;
  const cx1 = fromX + dx * 0.45;
  const cx2 = toX - dx * 0.45;
  return `M ${fromX} ${fromY} C ${cx1} ${fromY}, ${cx2} ${toY}, ${toX} ${toY}`;
}

function trimPoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  inset: number
): { x: number; y: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: fromX + (dx / len) * inset,
    y: fromY + (dy / len) * inset,
  };
}

export function SystemMapGraph({ selectedId, onSelect }: SystemMapGraphProps) {
  const activeEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of SYSTEM_MAP_EDGES) {
      if (edge.from === selectedId || edge.to === selectedId) {
        ids.add(edge.id);
      }
    }
    return ids;
  }, [selectedId]);

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<SystemMapNodeId>([selectedId]);
    for (const edge of SYSTEM_MAP_EDGES) {
      if (edge.from === selectedId) ids.add(edge.to);
      if (edge.to === selectedId) ids.add(edge.from);
    }
    return ids;
  }, [selectedId]);

  return (
    <div className="system-map-graph relative flex-1 min-h-0">
      <div className="absolute inset-0 system-map-starfield pointer-events-none" aria-hidden />

      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="w-full h-full"
        role="img"
        aria-label="TPT Peptides system architecture flow diagram"
      >
        <defs>
          <radialGradient id="system-map-node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(191,149,63,0.35)" />
            <stop offset="100%" stopColor="rgba(191,149,63,0)" />
          </radialGradient>
          <linearGradient id="system-map-beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(191,149,63,0)" />
            <stop offset="35%" stopColor="rgba(191,149,63,0.15)" />
            <stop offset="50%" stopColor="rgba(255,220,160,0.95)" />
            <stop offset="65%" stopColor="rgba(191,149,63,0.15)" />
            <stop offset="100%" stopColor="rgba(191,149,63,0)" />
          </linearGradient>
          <filter id="system-map-beam-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {SYSTEM_MAP_EDGES.map((edge) => {
          const from = SYSTEM_MAP_NODE_MAP[edge.from];
          const to = SYSTEM_MAP_NODE_MAP[edge.to];
          const start = trimPoint(from.x, from.y, to.x, to.y, NODE_R + 4);
          const end = trimPoint(to.x, to.y, from.x, from.y, NODE_R + 4);
          const d = edgePath(start.x, start.y, end.x, end.y);
          const isActive = activeEdgeIds.has(edge.id);

          return (
            <g key={edge.id}>
              <path
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
                className="transition-opacity duration-300"
                style={{ opacity: isActive ? 0.35 : 1 }}
              />
              {isActive ? (
                <>
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(191,149,63,0.25)"
                    strokeWidth={3}
                    filter="url(#system-map-beam-blur)"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke="url(#system-map-beam-gradient)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="system-map-edge-beam"
                    pathLength={100}
                  />
                </>
              ) : null}
            </g>
          );
        })}

        {SYSTEM_MAP_NODES.map((node) => {
          const isSelected = node.id === selectedId;
          const isConnected = connectedNodeIds.has(node.id);
          const dimmed = !isSelected && !isConnected;

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => onSelect(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(node.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${node.label}. ${isSelected ? 'Selected' : 'Select to view details'}`}
            >
              {isSelected ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_R + 18}
                  fill="url(#system-map-node-glow)"
                  className="system-map-node-pulse"
                />
              ) : null}

              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_R}
                className={cn(
                  'transition-all duration-300',
                  isSelected
                    ? 'fill-[#1a1610] stroke-gold stroke-[2.5]'
                    : isConnected
                      ? 'fill-[#121212] stroke-gold/50 stroke-[1.5]'
                      : 'fill-[#0f0f0f] stroke-white/20 stroke-[1]'
                )}
                style={{ opacity: dimmed ? 0.45 : 1 }}
              />

              <circle
                cx={node.x}
                cy={node.y}
                r={6}
                className={cn(
                  'transition-colors duration-300',
                  isSelected ? 'fill-gold' : isConnected ? 'fill-gold/60' : 'fill-white/25'
                )}
                style={{ opacity: dimmed ? 0.5 : 1 }}
              />

              <text
                x={node.x}
                y={node.y + NODE_R + 22}
                textAnchor="middle"
                className={cn(
                  'text-[11px] tracking-caps uppercase select-none pointer-events-none',
                  isSelected ? 'fill-gold-light' : 'fill-muted'
                )}
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontWeight: 500,
                  opacity: dimmed ? 0.5 : 1,
                }}
              >
                {node.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
