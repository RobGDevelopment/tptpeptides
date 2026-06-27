import React from 'react';
import { cn } from '../../lib/utils/cn';
import { HeaderDividerBeam } from './HeaderDividerBeam';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndexClass?: string;
  overlayClassName?: string;
  panelClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  zIndexClass = 'z-[60]',
  overlayClassName,
  panelClassName,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={cn('fixed inset-0 flex items-center justify-center p-4', zIndexClass)}>
      <div
        className={cn('absolute inset-0 bg-void/90 backdrop-blur-md', overlayClassName)}
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-md bg-surface/95 backdrop-blur-md p-8 border border-white/5 animate-in fade-in duration-200',
          panelClassName
        )}
      >
        <HeaderDividerBeam contained delay={0} className="absolute top-0 left-0 right-0" />
        {children}
      </div>
    </div>
  );
}
