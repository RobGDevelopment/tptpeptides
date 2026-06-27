import { cn } from '../../lib/utils/cn';
import { MetallicBeam } from './MetallicBeam';

interface PageHeaderProps {
  wordmark: string;
  title?: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}

export function PageHeader({
  wordmark,
  title,
  subtitle,
  align = 'center',
  className,
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
      <MetallicBeam variant="vertical" className="h-10 mb-8" />
      <p className="text-xs tracking-caps uppercase metallic-gold font-medium">{wordmark}</p>
      {title ? (
        <h1 className="mt-4 text-4xl md:text-6xl font-light tracking-title text-primary uppercase">
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className="mt-3 text-xs tracking-caps uppercase text-muted font-medium">{subtitle}</p>
      ) : null}
      <MetallicBeam variant="horizontal" className={cn('mt-8', centered ? 'w-48 max-w-full' : 'w-32')} />
    </header>
  );
}
