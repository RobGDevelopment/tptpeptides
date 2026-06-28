'use client';

import type { ReactNode } from 'react';
import type { ManualBlock } from '../../../lib/admin/manualTypes';
import { cn } from '../../../lib/utils/cn';

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="text-gold-light font-medium">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="font-mono text-[0.85em] text-gold-light/90">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function ManualBlockView({ block }: { block: ManualBlock }) {
  switch (block.type) {
    case 'heading': {
      const Tag = block.level === 1 ? 'h1' : block.level === 2 ? 'h2' : block.level === 3 ? 'h3' : 'h4';
      const className = cn(
        'font-light tracking-title uppercase text-heading',
        block.level === 1 && 'text-2xl mb-4',
        block.level === 2 && 'text-lg mt-2 mb-3 text-gold-light',
        block.level === 3 && 'text-sm mt-3 mb-2 text-primary',
        block.level === 4 && 'text-xs mt-2 mb-1 text-secondary tracking-caps'
      );
      return <Tag className={className}>{block.text}</Tag>;
    }
    case 'paragraph':
      return (
        <p className="text-sm text-secondary font-light leading-relaxed mb-3">{renderInline(block.text)}</p>
      );
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          className={cn(
            'text-sm text-secondary font-light space-y-1.5 mb-3 pl-4',
            block.ordered ? 'list-decimal' : 'list-disc marker:text-gold/50'
          )}
        >
          {block.items.map((item) => (
            <li key={item.slice(0, 48)}>{renderInline(item)}</li>
          ))}
        </ListTag>
      );
    }
    case 'table':
      return (
        <div className="overflow-x-auto mb-3 rounded border border-white/[0.06]">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                {block.headers.map((header) => (
                  <th
                    key={header}
                    className="px-2 py-1.5 text-left text-[9px] tracking-caps uppercase text-muted font-medium"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-white/[0.04] last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-2 py-1.5 text-secondary font-light align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-gold/30 pl-3 mb-3 text-xs text-muted font-light italic">
          {block.text}
        </blockquote>
      );
    case 'code':
      return (
        <pre className="text-[10px] font-mono text-gold-light/80 bg-black/40 border border-white/[0.06] p-3 mb-3 overflow-x-auto rounded">
          {block.text}
        </pre>
      );
    case 'hr':
      return <hr className="border-white/[0.08] my-4" />;
    default:
      return null;
  }
}

export function ManualPageRenderer({
  blocks,
  kind,
  sectionLabel,
  pageIndex,
  pageCount,
}: {
  blocks: ManualBlock[];
  kind: 'cover' | 'content';
  sectionLabel?: string;
  pageIndex: number;
  pageCount: number;
}) {
  return (
    <div className="manual-flip-page-inner h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-white/[0.08]">
        <span className="text-[9px] tracking-[0.2em] uppercase text-gold-light/80">
          {kind === 'cover' ? 'Executive Edition' : (sectionLabel ?? 'Operating Manual')}
        </span>
        <span className="text-[9px] tracking-widest uppercase text-muted tabular-nums">
          {pageIndex + 1} / {pageCount}
        </span>
      </div>

      <div className={cn('flex-1 overflow-hidden', kind === 'cover' && 'flex flex-col justify-center')}>
        {blocks.map((block, index) => (
          <ManualBlockView key={`${block.type}-${index}`} block={block} />
        ))}
      </div>

      <div className="pt-3 mt-auto border-t border-white/[0.06]">
        <p className="text-[8px] tracking-[0.25em] uppercase text-muted/70 text-center">Falconwood OS</p>
      </div>
    </div>
  );
}
