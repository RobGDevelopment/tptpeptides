import { cn } from '../../lib/utils/cn';

interface TerminalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  showArrow?: boolean;
}

export function TerminalButton({
  children,
  showArrow = true,
  className,
  disabled,
  ...props
}: TerminalButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'terminal-link inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline',
        className
      )}
      {...props}
    >
      {children}
      {showArrow ? <span aria-hidden>→</span> : null}
    </button>
  );
}

interface TerminalLinkButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TerminalLinkButton({ href, children, className, onClick }: TerminalLinkButtonProps) {
  return (
    <a href={href} onClick={onClick} className={cn('terminal-link', className)}>
      {children}
    </a>
  );
}
