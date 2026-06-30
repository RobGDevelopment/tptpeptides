'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { useClinicAuth } from '../../auth/providers/ClinicAuthProvider';
import { useTenantOptional } from '../../../lib/tenant/context';
import { resolveNavBrandName } from '../../../lib/clinic/landingDisplay';
import { mergeClinicLandingContent, type ClinicLandingContent } from '../../../lib/schemas/clinicLanding';
import { DEFAULT_CLINIC_LANDING } from '../../../lib/data/clinicLandingDefaults';

const CLINIC_NAV_LINKS = [
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#providers', label: 'Providers' },
] as const;

function navClassName(isActive: boolean): string {
  return isActive
    ? 'interactive-link interactive-link-static text-xs tracking-caps uppercase font-medium text-gold-light'
    : 'interactive-link text-xs tracking-caps uppercase font-medium text-muted hover:text-secondary transition-colors duration-200';
}

/** Clinic-lane navbar — no age gate, cart, or Firebase auth dependencies. */
export function ClinicPremiumNavbar() {
  const pathname = usePathname();
  const { user, signOut } = useClinicAuth();
  const tenant = useTenantOptional();
  const logoUrl = tenant?.config.theme?.logoUrl ?? tenant?.config.content?.logoUrl;
  const landingContent = mergeClinicLandingContent(
    tenant?.config.content as Partial<ClinicLandingContent> | undefined,
    DEFAULT_CLINIC_LANDING
  );
  const brandName = tenant?.config.content
    ? resolveNavBrandName(landingContent)
    : (tenant?.config.name ?? 'TPT Wellness');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-40">
      <nav className="relative border-b border-black/[0.06] bg-void/85 backdrop-blur-md">
        <HeaderDividerBeam contained delay={0} className="absolute bottom-0 left-0 right-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link href="/" className="flex items-center gap-3 text-primary group">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- tenant-configured remote logo URL
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="h-8 w-auto max-w-[140px] object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <span className="text-gold opacity-80 group-hover:opacity-100 transition-opacity">
                  <Icons.Shield />
                </span>
              )}
              <span className="text-sm font-medium tracking-title uppercase metallic-gold">
                {brandName}
              </span>
            </Link>

            <div className="hidden md:flex gap-8">
              <Link href="/" className={navClassName(pathname === '/')}>
                Home
              </Link>
              {user ? (
                <Link
                  href="/dashboard"
                  className={navClassName(pathname === '/dashboard' || pathname.endsWith('/dashboard'))}
                >
                  My Care
                </Link>
              ) : null}
              {CLINIC_NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={navClassName(false)}>
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3 sm:gap-6 text-primary">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="terminal-link hidden sm:inline-block"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors hidden sm:inline-block"
                  >
                    Sign Out
                  </button>
                  <Link
                    href="/dashboard"
                    className="text-muted hover:text-gold transition-colors hidden sm:block"
                    title="My Care"
                  >
                    <Icons.User />
                  </Link>
                </>
              ) : (
                <Link
                  href="/intake"
                  className="terminal-link hidden sm:inline-block"
                >
                  Sign In
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="md:hidden min-h-11 min-w-11 flex items-center justify-center text-muted hover:text-gold transition-colors duration-200"
                aria-label="Open menu"
                aria-expanded={menuOpen}
              >
                <Icons.Menu />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <div className="md:hidden border-b border-black/[0.06] bg-void/95 backdrop-blur-md px-4 py-4 space-y-3">
          <Link href="/" className="block text-sm text-secondary" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="block text-sm text-secondary"
                onClick={() => setMenuOpen(false)}
              >
                My Care
              </Link>
              <button
                type="button"
                className="block text-sm text-secondary text-left"
                onClick={() => {
                  setMenuOpen(false);
                  void signOut();
                }}
              >
                Sign Out
              </button>
            </>
          ) : null}
          {CLINIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm text-secondary"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
