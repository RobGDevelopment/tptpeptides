'use client';

import Link from 'next/link';
import {
  CORP_ENTITY_JOURNEY_LABELS,
  CORP_ENTITY_ORDER,
  CORP_ENTITIES,
  CORP_JOURNEY_LABELS,
  CORP_STEP_ORDER,
  type CorpEntityId,
  type CorpJourneyPhase,
  type CorpStepId,
} from '../../../../lib/admin/corpStrategyConfig';
import { cn } from '../../../../lib/utils/cn';
import type { CorpInteractionMode } from './CorpStrategyDetailRail';

interface CorpStrategyHeaderProps {
  mode: CorpInteractionMode;
  journeyPhase: CorpJourneyPhase;
  activeStepId: CorpStepId;
  activeEntityId: CorpEntityId;
  entityIndex: number;
  onPause: () => void;
  onResume: () => void;
}

function EntityProgressRail({
  activeEntityId,
  mode,
  journeyPhase,
}: {
  activeEntityId: CorpEntityId;
  mode: CorpInteractionMode;
  journeyPhase: CorpJourneyPhase;
}) {
  const activeIndex = CORP_ENTITY_ORDER.indexOf(activeEntityId);
  const isEntityPhase = mode === 'journey' && journeyPhase === 'entities';

  return (
    <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {CORP_ENTITY_ORDER.map((entityId, index) => {
        const isPast = index < activeIndex;
        const isCurrent = entityId === activeEntityId && isEntityPhase;
        const label = CORP_ENTITY_JOURNEY_LABELS[entityId];

        return (
          <div
            key={entityId}
            className={cn(
              'shrink-0 flex items-center gap-1 px-2 py-0.5 transition-all duration-500',
              isCurrent && 'text-emerald-300/90',
              isPast && !isCurrent && 'text-slate-500',
              !isPast && !isCurrent && 'text-slate-600 opacity-50'
            )}
          >
            <span
              className={cn(
                'w-1 h-1 rounded-full shrink-0',
                isCurrent && 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.7)] animate-pulse',
                isPast && !isCurrent && 'bg-emerald-400/40',
                !isPast && !isCurrent && 'bg-slate-600'
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

function StepProgressRail({
  activeStepId,
  mode,
  journeyPhase,
}: {
  activeStepId: CorpStepId;
  mode: CorpInteractionMode;
  journeyPhase: CorpJourneyPhase;
}) {
  const activeIndex = CORP_STEP_ORDER.indexOf(activeStepId);
  const isStepPhase = mode === 'journey' && journeyPhase === 'steps';

  return (
    <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {CORP_STEP_ORDER.map((stepId, index) => {
        const isPast = index < activeIndex;
        const isCurrent = stepId === activeStepId && isStepPhase;
        const label = CORP_JOURNEY_LABELS[stepId];

        return (
          <div
            key={stepId}
            className={cn(
              'shrink-0 flex items-center gap-1 px-2 py-0.5 transition-all duration-500',
              isCurrent && 'text-sky-300/90',
              isPast && !isCurrent && 'text-slate-500',
              !isPast && !isCurrent && 'text-slate-600 opacity-50'
            )}
          >
            <span
              className={cn(
                'w-1 h-1 rounded-full shrink-0',
                isCurrent && 'bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.7)] animate-pulse',
                isPast && !isCurrent && 'bg-sky-400/40',
                !isPast && !isCurrent && 'bg-slate-600'
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

export function CorpStrategyHeader({
  mode,
  journeyPhase,
  activeStepId,
  activeEntityId,
  entityIndex,
  onPause,
  onResume,
}: CorpStrategyHeaderProps) {
  const entity = CORP_ENTITIES[entityIndex];

  return (
    <header className="shrink-0 px-5 md:px-8 pt-5 pb-3 border-b border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0 flex-1">
          <Link
            href="/admin"
            className="inline-block text-[9px] font-bold tracking-widest uppercase text-slate-500 hover:text-sky-300/80 transition-colors"
          >
            ← Return to Dashboard
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-widest text-slate-100">
              Corp Strategy
            </h1>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[8px] font-bold tracking-widest uppercase',
                mode === 'journey' ? 'text-sky-400/70' : 'text-slate-500'
              )}
            >
              <span
                className={cn(
                  'w-1 h-1 rounded-full',
                  mode === 'journey' ? 'bg-sky-400 animate-pulse' : 'bg-slate-500'
                )}
                aria-hidden
              />
              {mode === 'journey' ? 'Guided' : 'Paused'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === 'journey' ? (
            <button
              type="button"
              onClick={onPause}
              className={cn(
                'text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-sm',
                'border border-sky-400/40 text-sky-300 hover:bg-sky-400/10 transition-colors'
              )}
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={onResume}
              className={cn(
                'text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-sm',
                'border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors'
              )}
            >
              Resume
            </button>
          )}
        </div>
      </div>

      {mode === 'journey' && journeyPhase === 'entities' && entity ? (
        <p className="mt-2 text-[10px] text-slate-400 truncate">
          Now reading: <span className="text-white font-medium">{entity.title}</span>
          <span className="text-slate-500"> · {entity.badge}</span>
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        <div>
          <p className="text-[8px] font-bold tracking-widest uppercase text-slate-600 mb-1">Entities</p>
          <EntityProgressRail
            activeEntityId={activeEntityId}
            mode={mode}
            journeyPhase={journeyPhase}
          />
        </div>
        <div>
          <p className="text-[8px] font-bold tracking-widest uppercase text-slate-600 mb-1">Process</p>
          <StepProgressRail activeStepId={activeStepId} mode={mode} journeyPhase={journeyPhase} />
        </div>
      </div>
    </header>
  );
}

export function CorpStrategyHero() {
  return (
    <header className="text-center mb-16 relative z-10 corp-strategy-fade-up">
      <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-500 mb-4">
        TPT Peptides Ecosystem
      </h1>
      <p className="text-slate-400 text-lg max-w-3xl mx-auto">
        Legal Architecture, Data Routing, and Financial Profit Flow from First Click to Product Delivery.
      </p>
    </header>
  );
}
