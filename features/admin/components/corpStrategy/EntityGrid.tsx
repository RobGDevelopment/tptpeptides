'use client';

import {
  CORP_ACCENT_CLASSES,
  CORP_ENTITIES,
  type CorpEntityId,
} from '../../../../lib/admin/corpStrategyConfig';
import { cn } from '../../../../lib/utils/cn';
import { CorpStrategyIcon } from './CorpStrategyIcons';

interface EntityGridProps {
  focusedEntityId: CorpEntityId | null;
  highlightedStepIds: Set<string>;
  onSelectEntity: (id: CorpEntityId) => void;
}

export function EntityGrid({ focusedEntityId, highlightedStepIds, onSelectEntity }: EntityGridProps) {
  const hasStepHighlight = highlightedStepIds.size > 0 && focusedEntityId === null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20 relative z-10">
      {CORP_ENTITIES.map((entity) => {
        const accent = CORP_ACCENT_CLASSES[entity.accent];
        const isFocused = focusedEntityId === entity.id;
        const isLinked =
          !hasStepHighlight ||
          entity.linkedStepIds.some((stepId) => highlightedStepIds.has(stepId));
        const isDimmed = (focusedEntityId !== null && !isFocused) || (hasStepHighlight && !isLinked);

        return (
          <button
            key={entity.id}
            type="button"
            onClick={() => onSelectEntity(entity.id)}
            className={cn(
              'corp-strategy-glass corp-strategy-fade-up p-6 rounded-2xl text-left transition-all duration-500',
              accent.glow,
              isFocused && 'ring-2 ring-white/25 scale-[1.03] brightness-110',
              isDimmed && 'opacity-40 scale-[0.98]',
              !isDimmed && !isFocused && 'hover:scale-[1.02] hover:brightness-110'
            )}
          >
            <div className={cn('text-3xl mb-3', accent.text)}>
              <CorpStrategyIcon name={entity.icon} size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">{entity.title}</h3>
            <span
              className={cn(
                'inline-block px-3 py-1 text-xs rounded-full mb-3 uppercase tracking-wider font-semibold',
                accent.bg,
                accent.text
              )}
            >
              {entity.badge}
            </span>
            <p className="text-slate-400 text-sm">{entity.description}</p>
          </button>
        );
      })}
    </div>
  );
}
