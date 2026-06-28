'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { forwardRef, useCallback, useRef, useState } from 'react';
import type { ExecutiveManualPayload, ManualFlipPage } from '../../../lib/admin/manualTypes';
import { cn } from '../../../lib/utils/cn';
import { ManualPageRenderer } from './ManualPageRenderer';

const HTMLFlipBook = dynamic(() => import('react-pageflip'), { ssr: false });

const FlipPage = forwardRef<
  HTMLDivElement,
  {
    page: ManualFlipPage;
    pageCount: number;
  }
>(function FlipPage({ page, pageCount }, ref) {
  return (
    <div
      ref={ref}
      className="manual-flip-page bg-[linear-gradient(145deg,rgba(18,18,22,0.98),rgba(10,10,12,0.99))] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(201,169,98,0.06),transparent_55%)]" />
      <div className="relative h-full p-6 md:p-8">
        <ManualPageRenderer
          blocks={page.blocks}
          kind={page.kind}
          sectionLabel={page.sectionLabel}
          pageIndex={page.pageIndex}
          pageCount={pageCount}
        />
      </div>
    </div>
  );
});

export function ExecutiveManualFlipbook({ manual }: { manual: ExecutiveManualPayload }) {
  const bookRef = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void } } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const onFlip = useCallback((event: { data: number }) => {
    setCurrentPage(event.data);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-primary">
      <header className="shrink-0 px-5 md:px-8 py-4 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <Link
              href="/admin"
              className="inline-block text-[9px] font-bold tracking-widest uppercase text-stone-500 hover:text-gold-light transition-colors"
            >
              ← Return to Back-Office
            </Link>
            <h1 className="text-sm md:text-base font-light tracking-[0.18em] uppercase text-stone-100 truncate">
              {manual.title}
            </h1>
            <p className="text-[10px] tracking-caps uppercase text-muted">{manual.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => bookRef.current?.pageFlip().flipPrev()}
              disabled={currentPage <= 0}
              className={cn(
                'px-3 py-1.5 text-[10px] tracking-caps uppercase border rounded-sm transition-colors',
                currentPage <= 0
                  ? 'border-white/[0.04] text-muted/40 cursor-not-allowed'
                  : 'border-white/[0.12] text-secondary hover:text-gold-light hover:border-gold/30'
              )}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => bookRef.current?.pageFlip().flipNext()}
              disabled={currentPage >= manual.pageCount - 1}
              className={cn(
                'px-3 py-1.5 text-[10px] tracking-caps uppercase border rounded-sm transition-colors',
                currentPage >= manual.pageCount - 1
                  ? 'border-white/[0.04] text-muted/40 cursor-not-allowed'
                  : 'border-gold/30 text-gold-light hover:bg-gold/[0.06]'
              )}
            >
              Next
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex items-center justify-center p-4 md:p-8 bg-[radial-gradient(ellipse_at_center,rgba(201,169,98,0.04),transparent_65%)]">
        <div className="w-full max-w-5xl">
          <HTMLFlipBook
            ref={bookRef}
            width={420}
            height={580}
            size="stretch"
            minWidth={280}
            maxWidth={520}
            minHeight={400}
            maxHeight={680}
            showCover
            mobileScrollSupport
            drawShadow
            maxShadowOpacity={0.45}
            flippingTime={680}
            usePortrait
            startPage={0}
            className="manual-flipbook mx-auto"
            onFlip={onFlip}
            style={{}}
          >
            {manual.pages.map((page) => (
              <FlipPage key={page.id} page={page} pageCount={manual.pageCount} />
            ))}
          </HTMLFlipBook>
        </div>
      </div>

      <footer className="shrink-0 px-5 md:px-8 py-3 border-t border-white/10 bg-black/80 backdrop-blur-xl flex items-center justify-between gap-3">
        <p className="text-[9px] tracking-widest uppercase text-stone-600">
          Drag page corners · Arrow keys supported when focused
        </p>
        <p className="text-[9px] tracking-widest uppercase text-gold-light/60 tabular-nums">
          Spread {Math.floor(currentPage / 2) + 1}
        </p>
      </footer>
    </div>
  );
}
