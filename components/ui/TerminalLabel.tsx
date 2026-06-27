import { cn } from '../../lib/utils/cn';

type TerminalLabelVariant = 'default' | 'positive' | 'negative';

interface TerminalLabelProps {
  children: React.ReactNode;
  variant?: TerminalLabelVariant;
  dot?: boolean;
  className?: string;
}

const variantClass: Record<TerminalLabelVariant, string> = {
  default: 'text-muted',
  positive: 'text-gold-light',
  negative: 'text-secondary',
};

export function TerminalLabel({
  children,
  variant = 'default',
  dot = true,
  className,
}: TerminalLabelProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[10px] tracking-caps uppercase font-medium',
        variantClass[variant],
        className
      )}
    >
      {dot ? (
        <span
          className={cn(
            'w-1 h-1 rounded-full',
            variant === 'positive' && 'bg-gold-light',
            variant === 'negative' && 'bg-muted',
            variant === 'default' && 'bg-muted'
          )}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
