'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils/cn';
import { HeaderDividerBeam } from './HeaderDividerBeam';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndexClass?: string;
  overlayClassName?: string;
  panelClassName?: string;
  /** Nearly full-viewport panel for complex flows (e.g. invite composer). */
  variant?: 'default' | 'fullscreen';
}

export function Modal({
  isOpen,
  onClose,
  children,
  zIndexClass = 'z-[60]',
  overlayClassName,
  panelClassName,
  variant = 'default',
}: ModalProps) {
  const isFullscreen = variant === 'fullscreen';

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modal = (
    <div className={cn('fixed inset-0', zIndexClass)}>
      <div
        className={cn('absolute inset-0 bg-void/90 backdrop-blur-md', overlayClassName)}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'absolute z-10 bg-surface/95 backdrop-blur-md border border-white/5 animate-in fade-in duration-200 overflow-hidden',
          isFullscreen
            ? 'inset-3 sm:inset-4 md:inset-5 lg:inset-6 flex flex-col'
            : 'left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-8 max-h-[calc(100vh-2rem)] overflow-y-auto',
          panelClassName
        )}
        role="dialog"
        aria-modal="true"
      >
        <HeaderDividerBeam contained delay={0} className="absolute top-0 left-0 right-0 pointer-events-none" />
        {children}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
}
