'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CORP_ENTITIES,
  CORP_ENTITY_MAP,
  CORP_STEP_ORDER,
  ENTITY_DWELL_MS,
  JOURNEY_DWELL_MS,
  type CorpEntityId,
  type CorpJourneyPhase,
  type CorpStepId,
} from '../../../../lib/admin/corpStrategyConfig';
import { cn } from '../../../../lib/utils/cn';
import { AnimatedFlowConnector } from './AnimatedFlowConnector';
import { CorpStrategyDetailRail, type CorpInteractionMode } from './CorpStrategyDetailRail';
import { CorpStrategyHeader, CorpStrategyHero } from './CorpStrategyHeader';
import { EntityGrid } from './EntityGrid';
import { ProcessTimeline } from './ProcessTimeline';
import { UnitEconomicsPanel } from './UnitEconomicsPanel';

export type { CorpJourneyPhase } from '../../../../lib/admin/corpStrategyConfig';

export function CorpStrategyPageContent() {
  const [mode, setMode] = useState<CorpInteractionMode>('journey');
  const [journeyPhase, setJourneyPhase] = useState<CorpJourneyPhase>('entities');
  const [entityIndex, setEntityIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedEntityId, setSelectedEntityId] = useState<CorpEntityId | null>(null);
  const [patientVolume, setPatientVolume] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const entityIndexRef = useRef(entityIndex);
  const stepIndexRef = useRef(stepIndex);
  const mainRef = useRef<HTMLElement>(null);

  entityIndexRef.current = entityIndex;
  stepIndexRef.current = stepIndex;

  const activeEntityId = CORP_ENTITIES[entityIndex]?.id ?? 'tpt';
  const activeStepId = CORP_STEP_ORDER[stepIndex] ?? 'intake';

  const focusedEntityId = useMemo((): CorpEntityId | null => {
    if (mode === 'explore' && selectedEntityId) return selectedEntityId;
    if (mode === 'journey' && journeyPhase === 'entities') return activeEntityId;
    return null;
  }, [mode, selectedEntityId, journeyPhase, activeEntityId]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const highlightedStepIds = useMemo(() => {
    if (mode === 'explore' && selectedEntityId) {
      return new Set(CORP_ENTITY_MAP[selectedEntityId].linkedStepIds);
    }
    if (mode === 'journey' && journeyPhase === 'entities') {
      return new Set(CORP_ENTITY_MAP[activeEntityId].linkedStepIds);
    }
    return new Set<CorpStepId>([activeStepId]);
  }, [selectedEntityId, mode, journeyPhase, activeEntityId, activeStepId]);

  const applyStepIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, CORP_STEP_ORDER.length - 1));
    setStepIndex(clamped);
  }, []);

  const scrollToStep = useCallback(
    (stepId: CorpStepId) => {
      const el = mainRef.current?.querySelector(`[data-step-id="${stepId}"]`);
      el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    },
    [reducedMotion]
  );

  const scrollToTop = useCallback(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [reducedMotion]);

  useEffect(() => {
    if (mode !== 'journey' || reducedMotion) return;

    const dwellMs = journeyPhase === 'entities' ? ENTITY_DWELL_MS : JOURNEY_DWELL_MS;

    const timer = window.setTimeout(() => {
      if (journeyPhase === 'entities') {
        const next = entityIndexRef.current + 1;
        if (next >= CORP_ENTITIES.length) {
          setJourneyPhase('steps');
          setStepIndex(0);
        } else {
          setEntityIndex(next);
        }
        return;
      }

      const next = stepIndexRef.current + 1;
      if (next >= CORP_STEP_ORDER.length) {
        window.setTimeout(() => {
          scrollToTop();
          setJourneyPhase('entities');
          setEntityIndex(0);
          setStepIndex(0);
        }, 1600);
      } else {
        applyStepIndex(next);
      }
    }, dwellMs);

    return () => window.clearTimeout(timer);
  }, [mode, journeyPhase, entityIndex, stepIndex, applyStepIndex, reducedMotion, scrollToTop]);

  useEffect(() => {
    if (mode === 'journey' && journeyPhase === 'steps' && !reducedMotion) {
      scrollToStep(activeStepId);
    }
  }, [activeStepId, mode, journeyPhase, scrollToStep, reducedMotion]);

  const pauseJourney = () => {
    setMode('explore');
  };

  const resumeJourney = () => {
    setSelectedEntityId(null);
    setMode('journey');
  };

  const handleSelectEntity = (entityId: CorpEntityId) => {
    setSelectedEntityId(entityId);
    setMode('explore');
    const index = CORP_ENTITIES.findIndex((entity) => entity.id === entityId);
    if (index >= 0) {
      setEntityIndex(index);
      setJourneyPhase('entities');
    }
  };

  const handleSelectStep = (stepId: CorpStepId) => {
    setSelectedEntityId(null);
    setMode('explore');
    setJourneyPhase('steps');
    const index = CORP_STEP_ORDER.indexOf(stepId);
    if (index >= 0) applyStepIndex(index);
    scrollToStep(stepId);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b1120] text-primary corp-strategy-canvas">
      <CorpStrategyHeader
        mode={mode}
        journeyPhase={journeyPhase}
        activeStepId={activeStepId}
        activeEntityId={activeEntityId}
        entityIndex={entityIndex}
        onPause={pauseJourney}
        onResume={resumeJourney}
      />

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <main ref={mainRef} className="flex-1 overflow-y-auto relative">
          <div className="relative p-6 md:p-12">
            <AnimatedFlowConnector activeStepId={activeStepId} className="hidden md:block opacity-40" />

            <CorpStrategyHero />

            <EntityGrid
              focusedEntityId={focusedEntityId}
              highlightedStepIds={highlightedStepIds}
              onSelectEntity={handleSelectEntity}
            />

            <ProcessTimeline
              activeStepId={activeStepId}
              highlightedStepIds={highlightedStepIds}
              onSelectStep={handleSelectStep}
            />

            <UnitEconomicsPanel patientVolume={patientVolume} onVolumeChange={setPatientVolume} />
          </div>
        </main>

        <div className="w-full lg:w-[min(340px,30vw)] shrink-0 min-h-0">
          <CorpStrategyDetailRail
            mode={mode}
            journeyPhase={journeyPhase}
            activeStepId={activeStepId}
            activeEntityId={activeEntityId}
            selectedEntityId={selectedEntityId}
            entityIndex={entityIndex}
            stepIndex={stepIndex}
            stepTotal={CORP_STEP_ORDER.length}
            onPause={pauseJourney}
            onResume={resumeJourney}
          />
        </div>
      </div>

      <footer className="shrink-0 px-5 md:px-8 py-2 border-t border-white/10 bg-[#0b1120]/80 flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold tracking-widest uppercase text-slate-600">
          {mode === 'journey'
            ? reducedMotion
              ? 'Reduced motion — click cards to navigate'
              : journeyPhase === 'entities'
                ? 'Reading each entity — pause anytime'
                : 'Process flow — pause anytime'
            : 'Paused — resume when ready'}
        </p>
        <div className="flex items-center gap-3">
          {mode === 'journey' ? (
            <button
              type="button"
              onClick={pauseJourney}
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
              onClick={resumeJourney}
              className={cn(
                'text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-sm',
                'border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors'
              )}
            >
              Resume
            </button>
          )}
          <span className="text-[9px] font-bold tracking-widest uppercase text-slate-600">
            Executive · Corp Strategy
          </span>
        </div>
      </footer>
    </div>
  );
}
