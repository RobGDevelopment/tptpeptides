'use client';

import { useEffect, useRef } from 'react';
import {
  CORP_ACCENT_CLASSES,
  CORP_TIMELINE_STEPS,
  type CorpStepId,
} from '../../../../lib/admin/corpStrategyConfig';
import { cn } from '../../../../lib/utils/cn';
import { CorpStrategyIcon } from './CorpStrategyIcons';

interface ProcessTimelineProps {
  activeStepId: CorpStepId;
  highlightedStepIds: Set<string>;
  onSelectStep: (id: CorpStepId) => void;
  onStepVisible?: (id: CorpStepId) => void;
}

function MoneyRows({
  rows,
  showTrendIcon,
}: {
  rows: { label: string; value: string }[];
  showTrendIcon?: boolean;
}) {
  return (
    <div className="inline-flex flex-col gap-2 w-full text-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            'flex items-center gap-2 text-emerald-500 font-semibold bg-emerald-500/10 px-3 py-2 rounded-lg',
            row.value && 'justify-between'
          )}
        >
          {showTrendIcon ? <CorpStrategyIcon name="trendUp" size={16} /> : null}
          <span>{row.label}</span>
          {row.value ? <span>{row.value}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function ProcessTimeline({
  activeStepId,
  highlightedStepIds,
  onSelectStep,
  onStepVisible,
}: ProcessTimelineProps) {
  const stepRefs = useRef<Partial<Record<CorpStepId, HTMLDivElement | null>>>({});

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const step of CORP_TIMELINE_STEPS) {
      const el = stepRefs.current[step.id];
      if (!el || !onStepVisible) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) onStepVisible(step.id);
        },
        { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [onStepVisible]);

  const hasHighlight = highlightedStepIds.size > 0;

  return (
    <div className="relative max-w-6xl mx-auto mb-24">
      <div className="corp-strategy-line-connector hidden md:block" aria-hidden />

      {CORP_TIMELINE_STEPS.map((step) => {
        const accent = CORP_ACCENT_CLASSES[step.accent];
        const glowAccent = step.cardGlow ? CORP_ACCENT_CLASSES[step.cardGlow] : null;
        const isActive = activeStepId === step.id;
        const isHighlighted = highlightedStepIds.has(step.id);
        const isDimmed = hasHighlight && !isHighlighted && !isActive;

        const cardContent = (
          <div
            className={cn(
              'corp-strategy-glass p-6 rounded-2xl transition-all duration-500 cursor-pointer',
              step.cardAlign === 'left' ? 'text-right' : 'text-left',
              glowAccent?.glow,
              isActive && cn(accent.glow, 'ring-1 ring-white/10'),
              isDimmed && 'opacity-35',
              !isDimmed && 'hover:brightness-110'
            )}
            onClick={() => onSelectStep(step.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectStep(step.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <h4 className="text-xl font-bold text-white mb-2">{step.title}</h4>
            <p className="text-slate-400 text-sm mb-4">{step.body}</p>
            {step.number === 1 ? (
              <MoneyRows rows={step.moneyRows} showTrendIcon />
            ) : (
              <>
                <MoneyRows rows={step.moneyRows} />
                {step.legalNote ? (
                  <div className="text-xs text-slate-500 italic mt-2">{step.legalNote}</div>
                ) : null}
              </>
            )}
          </div>
        );

        const actionContent = (
          <div className={step.reversed ? 'text-right pr-0 md:pr-8' : 'text-left pl-0 md:pl-8'}>
            <span className={cn('font-bold uppercase tracking-widest text-sm', accent.text)}>
              {step.actionLabel}
            </span>
            <h3 className="text-2xl font-bold mt-1 mb-2 text-white">{step.actionHeadline}</h3>
          </div>
        );

        const node = (
          <div
            className={cn(
              'w-12 h-12 bg-[#0b1120] border-4 rounded-full z-10 flex items-center justify-center font-bold hidden md:flex transition-all duration-500',
              accent.border,
              accent.text,
              isActive && 'corp-strategy-node-pulse scale-110'
            )}
          >
            <CorpStrategyIcon name={step.icon} size={20} />
          </div>
        );

        return (
          <div
            key={step.id}
            ref={(el) => {
              stepRefs.current[step.id] = el;
            }}
            data-step-id={step.id}
            className={cn(
              'flex flex-col md:flex-row items-center justify-between mb-16 relative z-10 corp-strategy-fade-up',
              step.reversed && 'flex-col-reverse md:flex-row'
            )}
          >
            {step.reversed ? (
              <>
                <div className="w-full md:w-5/12 mb-6 md:mb-0">{actionContent}</div>
                {node}
                <div className="w-full md:w-5/12">{cardContent}</div>
              </>
            ) : (
              <>
                <div className="w-full md:w-5/12 mb-6 md:mb-0">{cardContent}</div>
                {node}
                <div className="w-full md:w-5/12">{actionContent}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
