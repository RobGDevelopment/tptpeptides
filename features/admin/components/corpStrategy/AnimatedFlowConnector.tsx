'use client';

import { CORP_STEP_ORDER, type CorpStepId } from '../../../../lib/admin/corpStrategyConfig';
import { cn } from '../../../../lib/utils/cn';

interface AnimatedFlowConnectorProps {
  activeStepId: CorpStepId;
  className?: string;
}

const SEGMENT_COUNT = CORP_STEP_ORDER.length;

export function AnimatedFlowConnector({ activeStepId, className }: AnimatedFlowConnectorProps) {
  const activeIndex = CORP_STEP_ORDER.indexOf(activeStepId);

  return (
    <svg
      className={cn('absolute inset-0 w-full h-full pointer-events-none z-0', className)}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      aria-hidden
    >
      <defs>
        <linearGradient id="corp-flow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="corp-flow-active" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <line
        x1="50"
        y1="5"
        x2="50"
        y2="95"
        stroke="url(#corp-flow-gradient)"
        strokeWidth="0.4"
        strokeOpacity="0.25"
        vectorEffect="non-scaling-stroke"
      />

      {CORP_STEP_ORDER.map((_, index) => {
        const segmentHeight = 90 / SEGMENT_COUNT;
        const y1 = 5 + index * segmentHeight;
        const y2 = y1 + segmentHeight;
        const isActive = index === activeIndex;
        const isPast = index < activeIndex;

        return (
          <line
            key={index}
            x1="50"
            y1={y1}
            x2="50"
            y2={y2}
            stroke={isActive ? 'url(#corp-flow-active)' : 'url(#corp-flow-gradient)'}
            strokeWidth={isActive ? 0.6 : 0.4}
            strokeOpacity={isPast || isActive ? 0.85 : 0.15}
            vectorEffect="non-scaling-stroke"
            className={cn(isActive && 'corp-strategy-flow-pulse')}
          />
        );
      })}
    </svg>
  );
}
