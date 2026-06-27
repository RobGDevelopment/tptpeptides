import { cn } from '../../lib/utils/cn';

export type MetallicBeamVariant = 'horizontal' | 'vertical' | 'top';

interface MetallicBeamProps {
  variant?: MetallicBeamVariant;
  className?: string;
  animated?: boolean;
}

const variantClass: Record<MetallicBeamVariant, string> = {
  horizontal: 'metallic-beam-h w-full',
  vertical: 'metallic-beam-v h-full',
  top: 'metallic-beam-top',
};

export function MetallicBeam({
  variant = 'horizontal',
  className,
  animated = true,
}: MetallicBeamProps) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn(
        variantClass[variant],
        !animated && '[animation:none!important] [background-position:center!important]',
        className
      )}
    />
  );
}
