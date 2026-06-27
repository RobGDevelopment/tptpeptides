import React from 'react';
import { cn } from '../../lib/utils/cn';
import { MetallicBeam } from './MetallicBeam';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('relative bg-surface/40 backdrop-blur-sm', className)}>
      <MetallicBeam variant="horizontal" className="absolute bottom-0 left-0 right-0 opacity-60" animated={false} />
      {children}
    </div>
  );
}
