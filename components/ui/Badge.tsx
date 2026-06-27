import React from 'react';
import { cn } from '../../lib/utils/cn';

type BadgeVariant = 'success' | 'danger' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  neutral: 'bg-white/5 text-gray-400 border-white/10',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
