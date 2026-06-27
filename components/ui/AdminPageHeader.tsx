import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';
import { HeaderDividerBeam, type HeaderDividerBeamDelay } from './HeaderDividerBeam';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  beamDelay?: HeaderDividerBeamDelay;
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  className,
  beamDelay = 1,
}: AdminPageHeaderProps) {
  return (
    <header className={cn('space-y-1', className)}>
      <div className={cn('flex flex-col gap-4', actions != null && 'sm:flex-row sm:items-start sm:justify-between')}>
        <div>
          <h1 className="admin-heading">{title}</h1>
          {subtitle ? <p className="admin-subheading">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-4 items-center shrink-0">{actions}</div> : null}
      </div>
      <HeaderDividerBeam delay={beamDelay} className="mt-6" />
    </header>
  );
}
