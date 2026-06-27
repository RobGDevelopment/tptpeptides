import React from 'react';
import { cn } from '../../lib/utils/cn';
import { HeaderDividerBeam } from './HeaderDividerBeam';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('relative bg-surface/40 backdrop-blur-sm border border-white/5', className)}>
      <HeaderDividerBeam contained animated={false} className="absolute bottom-0 left-0 right-0 opacity-60" />
      {children}
    </div>
  );
}
