'use client';

import { useRef } from 'react';
import { MoleculeScene } from './MoleculeScene';
import { VialThumbnail } from './VialThumbnail';

interface InteractiveVialSceneProps {
  tag: string;
}

export function InteractiveVialScene({ tag }: InteractiveVialSceneProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    panel.style.setProperty('--tilt-x', `${y * -10}deg`);
    panel.style.setProperty('--tilt-y', `${x * 12}deg`);
  };

  const handlePointerLeave = () => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.setProperty('--tilt-x', '0deg');
    panel.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <div
      ref={panelRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative min-h-[420px] flex items-center justify-center overflow-hidden rounded-sm border border-white/[0.06] bg-void/60"
      style={{
        transform: 'perspective(900px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
        transition: 'transform 120ms ease-out',
      }}
    >
      <MoleculeScene />
      <div className="relative z-10 scale-[1.35]">
        <VialThumbnail tag={tag} size="lg" />
      </div>
      <p className="absolute bottom-4 left-0 right-0 text-center text-[9px] tracking-caps uppercase text-muted/80">
        Interactive molecular preview · Research visualization only
      </p>
    </div>
  );
}
