import { cn } from '../../lib/utils/cn';
import { MetallicBeam } from './MetallicBeam';

interface TerminalPanelProps {
  children: React.ReactNode;
  className?: string;
  hoverBeam?: boolean;
  as?: 'div' | 'article' | 'section';
}

export function TerminalPanel({
  children,
  className,
  hoverBeam = false,
  as: Tag = 'div',
}: TerminalPanelProps) {
  return (
    <Tag
      className={cn(
        'group relative bg-surface/40 backdrop-blur-sm transition-colors duration-300',
        hoverBeam && 'hover:bg-surface/55',
        className
      )}
    >
      {children}
      {hoverBeam ? (
        <MetallicBeam
          variant="horizontal"
          className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
      ) : null}
    </Tag>
  );
}
