interface VialThumbnailProps {
  tag?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { wrapper: 'w-10 h-16', cap: 'w-12 h-1.5', label: 'text-[7px]', tag: 'text-[8px]' },
  md: { wrapper: 'w-12 h-20', cap: 'w-14 h-2', label: 'text-[8px]', tag: 'text-[10px]' },
  lg: { wrapper: 'w-16 h-28', cap: 'w-[4.5rem] h-2.5', label: 'text-[9px]', tag: 'text-xs' },
} as const;

export function VialThumbnail({ tag, size = 'md', className = '' }: VialThumbnailProps) {
  const sizes = sizeClasses[size];

  return (
    <div
      className={`${sizes.wrapper} border border-white/[0.08] rounded-b-lg rounded-t-sm bg-void/80 backdrop-blur-sm relative flex flex-col items-center pt-2 ${className}`}
    >
      <div
        className={`absolute -top-1 ${sizes.cap} rounded-sm`}
        style={{
          background: 'linear-gradient(105deg, oklch(0.58 0.06 85), oklch(0.78 0.07 88), oklch(0.62 0.05 80))',
        }}
      />
      <span className={`${sizes.label} text-muted font-medium uppercase tracking-caps mt-1`}>TPT</span>
      {tag ? (
        <span className={`${sizes.tag} text-secondary font-mono mt-1 text-center px-1 leading-tight`}>
          {tag}
        </span>
      ) : null}
    </div>
  );
}
