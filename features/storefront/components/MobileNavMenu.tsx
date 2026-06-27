'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { SITE_WORDMARK } from '../../../lib/brand';
import { cn } from '../../../lib/utils/cn';

const NAV_LINKS = [
  { href: '/', label: 'Storefront' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/research', label: 'Research' },
  { href: '/lab-results', label: 'Lab Results' },
  { href: '/protocols', label: 'Protocols' },
] as const;

interface MobileNavMenuProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  isSignedIn: boolean;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
}

function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavMenu({
  open,
  onClose,
  isAdmin,
  isSignedIn,
  onOpenAuth,
  onOpenAdmin,
}: MobileNavMenuProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
    >
      <div
        className={cn(
          'absolute inset-0 bg-void/90 backdrop-blur-md transition-opacity duration-300 ease-out',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          'relative h-full flex flex-col bg-void/98 backdrop-blur-lg border-b border-white/[0.04] mobile-nav-panel safe-area-inset transition-all duration-300 ease-out',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        )}
      >
        <HeaderDividerBeam contained delay={0} className="absolute top-0 left-0 right-0" />

        <div className="flex items-center justify-between h-20 px-4 sm:px-6 shrink-0">
          <span className="text-sm font-medium tracking-title uppercase metallic-gold">
            {SITE_WORDMARK}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 flex items-center justify-center text-muted hover:text-gold transition-colors duration-200"
            aria-label="Close menu"
          >
            <Icons.X />
          </button>
        </div>

        <HeaderDividerBeam contained delay={1} />

        <nav className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <ul className="space-y-1">
            {NAV_LINKS.map((link, index) => {
              const active = isLinkActive(pathname, link.href);
              return (
                <li
                  key={link.href}
                  className={cn('mobile-nav-link-item', visible && 'mobile-nav-link-item-visible')}
                  style={{ transitionDelay: visible ? `${80 + index * 45}ms` : '0ms' }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      'mobile-nav-link interactive-link block text-sm tracking-caps uppercase font-medium transition-colors duration-200',
                      active ? 'text-gold-light interactive-link-static' : 'text-secondary hover:text-primary'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <HeaderDividerBeam contained delay={2} className="my-8" />

          <ul className="space-y-1">
            {isSignedIn ? (
              <li
                className={cn('mobile-nav-link-item', visible && 'mobile-nav-link-item-visible')}
                style={{ transitionDelay: visible ? '305ms' : '0ms' }}
              >
                <Link
                  href="/account"
                  onClick={onClose}
                  className="mobile-nav-link flex items-center gap-3 text-sm tracking-caps uppercase font-medium text-secondary hover:text-primary transition-colors duration-200 interactive-link"
                >
                  <span className="text-gold">
                    <Icons.User />
                  </span>
                  My Account
                </Link>
              </li>
            ) : (
              <li
                className={cn('mobile-nav-link-item', visible && 'mobile-nav-link-item-visible')}
                style={{ transitionDelay: visible ? '305ms' : '0ms' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="mobile-nav-link flex items-center gap-3 w-full text-left text-sm tracking-caps uppercase font-medium text-secondary hover:text-primary transition-colors duration-200 interactive-link"
                >
                  <span className="text-gold">
                    <Icons.User />
                  </span>
                  Client Portal
                </button>
              </li>
            )}

            {isAdmin ? (
              <li
                className={cn('mobile-nav-link-item', visible && 'mobile-nav-link-item-visible')}
                style={{ transitionDelay: visible ? '350ms' : '0ms' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="mobile-nav-link w-full text-left text-sm tracking-caps uppercase font-medium text-gold-light interactive-link interactive-link-static"
                >
                  Back-Office
                </button>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
    </div>
  );
}
