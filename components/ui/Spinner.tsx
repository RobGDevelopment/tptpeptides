import React from 'react';
import { cn } from '../../lib/utils/cn';

interface SpinnerProps {
  label?: string;
  className?: string;
}

export function Spinner({ label, className }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center space-y-4', className)}>
      <div className="w-8 h-8 border-2 border-gold/20 border-t-gold-light rounded-full animate-spin" />
      {label && (
        <p className="text-[10px] tracking-caps uppercase text-muted font-light">{label}</p>
      )}
    </div>
  );
}
