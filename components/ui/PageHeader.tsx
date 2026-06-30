import { cn } from '../../lib/utils/cn';
import { MetallicBeam } from './MetallicBeam';
import { HeaderDividerBeam } from './HeaderDividerBeam';

interface PageHeaderProps {
  wordmark: string;
  title?: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
  compact?: boolean;
}

export function PageHeader({
  wordmark,
  title,
  subtitle,
  align = 'center',
  className,
  compact = false,
}: PageHeaderProps) {
  const centered = align === 'center';

  return (
    <header
      className={cn(
        'flex flex-col',
        centered ? 'items-center text-center' : 'items-start text-left',
        className
      )}
    >
      <MetallicBeam variant="vertical" className={compact ? 'h-6 mb-3' : 'h-10 mb-8'} />
      <p className={cn('tracking-caps uppercase metallic-gold font-medium', compact ? 'text-[10px]' : 'text-xs')}>
        {wordmark}
      </p>
      {title ? (
        <h1
          className={cn(
            'font-light tracking-title text-heading uppercase',
            compact ? 'mt-2 text-xl leading-tight' : 'mt-4 text-4xl md:text-6xl'
          )}
        >
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className={cn('tracking-caps uppercase text-muted font-medium', compact ? 'mt-1 text-[10px]' : 'mt-3 text-xs')}>
          {subtitle}
        </p>
      ) : null}
      <HeaderDividerBeam delay={centered ? 0 : 1} className={compact ? 'mt-3' : 'mt-8'} />
    </header>
  );
}
