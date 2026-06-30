'use client';

import {
  CORP_ACCENT_CLASSES,
  CORP_ENTITIES,
  CORP_ENTITY_MAP,
  CORP_STEP_MAP,
  getLinkedEntitiesForStep,
  type CorpEntity,
  type CorpEntityId,
  type CorpJourneyPhase,
  type CorpStepId,
  type CorpTimelineStep,
} from '../../../../lib/admin/corpStrategyConfig';
import { cn } from '../../../../lib/utils/cn';
import { CorpStrategyIcon } from './CorpStrategyIcons';

export type CorpInteractionMode = 'journey' | 'explore';

interface CorpStrategyDetailRailProps {
  mode: CorpInteractionMode;
  journeyPhase: CorpJourneyPhase;
  activeStepId: CorpStepId;
  activeEntityId: CorpEntityId;
  selectedEntityId: CorpEntityId | null;
  entityIndex: number;
  stepIndex: number;
  stepTotal: number;
  onPause: () => void;
  onResume: () => void;
}

const PANEL_SHELL =
  'flex flex-col overflow-hidden bg-white/[0.03] backdrop-blur-xl border-t lg:border-t-0 border-l border-white/10 h-full min-h-[200px] lg:min-h-0';

function EntityDetail({ entity }: { entity: CorpEntity }) {
  const accent = CORP_ACCENT_CLASSES[entity.accent];

  return (
    <div className="space-y-4">
      <div className={cn('text-2xl', accent.text)}>
        <CorpStrategyIcon name={entity.icon} size={28} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white">{entity.title}</h3>
        <span
          className={cn(
            'inline-block mt-2 px-2 py-0.5 text-[10px] rounded-full uppercase tracking-wider font-semibold',
            accent.bg,
            accent.text
          )}
        >
          {entity.badge}
        </span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{entity.description}</p>
      <div>
        <p className="text-[9px] font-bold tracking-widest uppercase text-slate-500 mb-2">
          Role in the flow
        </p>
        <ul className="space-y-1">
          {entity.linkedStepIds.map((stepId) => {
            const step = CORP_STEP_MAP[stepId];
            return (
              <li key={stepId} className="text-xs text-slate-300">
                {step.title}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StepDetail({ step }: { step: CorpTimelineStep }) {
  const accent = CORP_ACCENT_CLASSES[step.accent];
  const linkedEntities = getLinkedEntitiesForStep(step.id);

  return (
    <div className="space-y-4">
      <div>
        <p className={cn('text-[10px] font-bold tracking-widest uppercase', accent.text)}>
          {step.actionLabel}
        </p>
        <h3 className="text-lg font-bold text-white mt-1">{step.actionHeadline}</h3>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-white">{step.title}</h4>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">{step.body}</p>
      </div>
      {step.moneyRows.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[9px] font-bold tracking-widest uppercase text-slate-500">Money flow</p>
          {step.moneyRows.map((row) => (
            <div
              key={row.label}
              className="text-xs text-emerald-500 bg-emerald-500/10 px-3 py-2 rounded-lg flex justify-between gap-2"
            >
              <span>{row.label}</span>
              {row.value ? <span className="shrink-0">{row.value}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      {step.legalNote ? (
        <p className="text-xs text-slate-500 italic border-l-2 border-slate-700 pl-3">{step.legalNote}</p>
      ) : null}
      <div>
        <p className="text-[9px] font-bold tracking-widest uppercase text-slate-500 mb-2">Entities involved</p>
        <ul className="space-y-1">
          {linkedEntities.map((entity) => (
            <li key={entity.id} className="text-xs text-slate-300">
              {entity.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function railLabel(
  mode: CorpInteractionMode,
  journeyPhase: CorpJourneyPhase,
  selectedEntityId: CorpEntityId | null,
  entityIndex: number,
  stepIndex: number,
  stepTotal: number
): string {
  if (mode === 'explore' && selectedEntityId) {
    return 'Entity focus';
  }
  if (mode === 'journey' && journeyPhase === 'entities') {
    return `Entity ${entityIndex + 1} / ${CORP_ENTITIES.length}`;
  }
  return `Step ${stepIndex + 1} / ${stepTotal}`;
}

export function CorpStrategyDetailRail({
  mode,
  journeyPhase,
  activeStepId,
  activeEntityId,
  selectedEntityId,
  entityIndex,
  stepIndex,
  stepTotal,
  onPause,
  onResume,
}: CorpStrategyDetailRailProps) {
  const step = CORP_STEP_MAP[activeStepId];
  const showEntityDetail =
    (mode === 'journey' && journeyPhase === 'entities') ||
    (mode === 'explore' && selectedEntityId !== null);

  const entityId = mode === 'explore' && selectedEntityId ? selectedEntityId : activeEntityId;
  const entity = CORP_ENTITY_MAP[entityId];
  const isPaused = mode === 'explore';

  return (
    <aside className={PANEL_SHELL}>
      <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3 border-b border-white/[0.06]">
        <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400">
          {railLabel(mode, journeyPhase, selectedEntityId, entityIndex, stepIndex, stepTotal)}
        </p>
        <div className="flex items-center gap-2">
          {mode === 'journey' ? (
            <button
              type="button"
              onClick={onPause}
              className="text-[9px] font-bold tracking-widest uppercase text-sky-400 hover:text-sky-300 transition-colors px-2 py-1"
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={onResume}
              className="text-[9px] font-bold tracking-widest uppercase text-emerald-500 hover:text-emerald-400 transition-colors px-2 py-1"
            >
              Resume
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {showEntityDetail ? <EntityDetail entity={entity} /> : <StepDetail step={step} />}
      </div>

      <div className="shrink-0 px-5 py-3 border-t border-white/[0.06]">
        <p className="text-[9px] text-slate-500 leading-relaxed">
          {isPaused
            ? 'Resume to continue the guided tour, or click another card to explore.'
            : journeyPhase === 'entities'
              ? 'Each entity is highlighted in turn. Linked process steps glow below.'
              : 'Process steps auto-advance. Pause anytime for more reading time.'}
        </p>
      </div>
    </aside>
  );
}
