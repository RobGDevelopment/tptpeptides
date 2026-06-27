'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { useAuth } from '../../auth/providers/AuthProvider';
import { navigateToAdmin } from '../../../lib/firebase/adminNav';
import { SITE_WORDMARK } from '../../../lib/brand';
import { selectCartCount, useCartStore } from '../stores/useCartStore';

const NAV_LINKS = [
  { href: '/catalog', label: 'Catalog' },
  { href: '/research', label: 'Research' },
  { href: '/lab-results', label: 'Lab Results' },
  { href: '/protocols', label: 'Protocols' },
] as const;

function navClassName(isActive: boolean): string {
  return isActive
    ? 'text-xs tracking-caps uppercase font-medium text-gold-light'
    : 'text-xs tracking-caps uppercase font-medium text-muted hover:text-secondary transition-colors duration-200';
}

export function PremiumNavbar() {
  const pathname = usePathname();
  const cartCount = useCartStore(selectCartCount);
  const openCart = useCartStore((state) => state.openCart);
  const openAuth = useCartStore((state) => state.openAuth);
  const { user, isAdmin } = useAuth();

  return (
    <header className="fixed top-0 w-full z-40">
      <nav className="relative bg-void/70 backdrop-blur-md border-b border-white/[0.04]">
        <HeaderDividerBeam contained delay={0} className="absolute bottom-0 left-0 right-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link href="/" className="flex items-center gap-3 text-primary group">
              <span className="text-gold opacity-80 group-hover:opacity-100 transition-opacity">
                <Icons.Flask />
              </span>
              <span className="text-sm font-medium tracking-title uppercase metallic-gold">
                {SITE_WORDMARK}
              </span>
            </Link>

            <div className="hidden md:flex gap-8">
              <Link href="/" className={navClassName(pathname === '/')}>
                Storefront
              </Link>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={navClassName(
                    pathname === link.href || pathname.startsWith(`${link.href}/`)
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-6 text-primary">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => void navigateToAdmin()}
                  className="text-[10px] tracking-caps uppercase text-gold-light hover:text-gold transition-colors hidden sm:block"
                >
                  Back-Office
                </button>
              ) : null}
              {user ? (
                <Link
                  href="/account"
                  className="text-muted hover:text-gold transition-colors hidden sm:block"
                  title="My Account"
                >
                  <Icons.User />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openAuth}
                  className="text-muted hover:text-gold transition-colors hidden sm:block"
                  title="Client Portal"
                >
                  <Icons.User />
                </button>
              )}
              <button
                type="button"
                onClick={openCart}
                className="relative text-muted hover:text-gold transition-colors"
              >
                <Icons.Cart />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] font-medium text-gold">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
