import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils/cn';

export type HeaderDividerBeamDelay = 0 | 1 | 2 | 3;

interface HeaderDividerBeamProps {
  className?: string;
  animated?: boolean;
  /** Offset animation phase so multiple beams on a page feel organic. */
  delay?: HeaderDividerBeamDelay;
  /** Keep the beam inside its parent (modals, cards, drawers). Default spans the viewport. */
  contained?: boolean;
}

const delayClass: Record<HeaderDividerBeamDelay, string> = {
  0: '',
  1: 'header-beam-shuttle-delay-1',
  2: 'header-beam-shuttle-delay-2',
  3: 'header-beam-shuttle-delay-3',
};

/** Faint full-width track — always visible, fades at both screen edges. */
const trackStyle: CSSProperties = {
  background:
    'linear-gradient(90deg, transparent 0%, rgba(191,149,63,0.05) 6%, rgba(191,149,63,0.12) 50%, rgba(191,149,63,0.05) 94%, transparent 100%)',
};

/** Traveling highlight — soft bloom that enters and exits through the edges. */
const highlightStyle: CSSProperties = {
  background:
    'linear-gradient(90deg, transparent 0%, rgba(191,149,63,0.04) 12%, rgba(191,149,63,0.22) 38%, rgba(191,149,63,0.5) 50%, rgba(191,149,63,0.22) 62%, rgba(191,149,63,0.04) 88%, transparent 100%)',
  backgroundSize: '32% 100%',
  backgroundRepeat: 'no-repeat',
  boxShadow: '0 0 12px rgba(191,149,63,0.1)',
};

/**
 * Full-width horizontal rule with a gold highlight that sweeps edge-to-edge,
 * fading in and out as it crosses the screen.
 */
export function HeaderDividerBeam({
  className,
  animated = true,
  delay = 0,
  contained = false,
}: HeaderDividerBeamProps) {
  return (
    <div
      className={cn(
        'relative h-px shrink-0',
        contained ? 'w-full' : 'w-screen max-w-[100vw] ml-[calc(50%-50vw)]',
        className
      )}
      role="presentation"
      aria-hidden
    >
      <div className="absolute inset-0" style={trackStyle} />
      <div
        className={cn(
          'absolute inset-0 header-beam-shuttle',
          delayClass[delay],
          !animated && '[animation:none!important] [background-position:50%_0!important]'
        )}
        style={highlightStyle}
      />
    </div>
  );
}
