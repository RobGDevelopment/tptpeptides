import React from 'react';
import { cn } from '../../lib/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'terminal-link text-sm disabled:opacity-40',
  secondary: 'terminal-link text-sm text-primary disabled:opacity-40',
  ghost: 'text-[10px] tracking-caps uppercase text-muted hover:text-gold-light transition-colors duration-200 disabled:opacity-40',
};

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer disabled:cursor-not-allowed',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
      {variant === 'primary' ? <span aria-hidden>→</span> : null}
    </button>
  );
}
