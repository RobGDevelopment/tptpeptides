'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useAuth } from '../../auth/providers/AuthProvider';
import { cn } from '../../../lib/utils/cn';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { SITE_WORDMARK } from '../../../lib/brand';
import type { ModuleFlags } from '../../../lib/schemas/modules';
import { buildAdminNavSections } from '../../../lib/modules/adminNav';

export function AdminShell({
  children,
  moduleFlags,
}: {
  children: React.ReactNode;
  moduleFlags: ModuleFlags;
}) {
  const pathname = usePathname();
  const { user, signOut, canAccessExecutiveManual } = useAuth();
  const isImmersiveMap = pathname === '/admin/system-map';
  const isImmersiveManual = pathname === '/admin/manual';
  const isImmersive = isImmersiveMap || isImmersiveManual;
  const navSections = useMemo(() => buildAdminNavSections(moduleFlags), [moduleFlags]);

  if (isImmersive) {
    return <div className="min-h-screen bg-black text-primary">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-void text-primary flex">
      <aside className="w-64 shrink-0 border-r border-white/[0.04] bg-surface/30 backdrop-blur-xl flex flex-col relative">
        <span className="absolute top-0 right-0 h-full w-px bg-white/[0.06]" aria-hidden />

        <div className="p-6 border-b border-white/[0.04] space-y-3">
          <div className="space-y-2">
            <Link
              href="/"
              className="block text-[10px] tracking-caps uppercase metallic-gold font-medium hover:text-gold-light transition-colors"
            >
              {SITE_WORDMARK}
            </Link>
            <Link
              href="/admin"
              className="block text-sm font-light tracking-title uppercase text-primary hover:text-gold-light transition-colors"
            >
              Back-Office
            </Link>
          </div>
          <HeaderDividerBeam delay={2} />
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title ?? 'core'} className="space-y-1">
              {section.title ? (
                <p className="px-4 pb-2 text-[10px] tracking-caps uppercase text-muted/80">{section.title}</p>
              ) : null}
              {section.items.map((item) => {
                if (item.href === '/admin/manual' && !canAccessExecutiveManual) {
                  return null;
                }
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'interactive-link relative block px-4 py-3 text-sm font-light transition-colors duration-200 rounded-sm',
                      item.premium
                        ? 'mt-2 mb-1 border border-gold/25 bg-gold/[0.04] backdrop-blur-md shadow-[0_0_24px_rgba(201,169,98,0.08)]'
                        : '',
                      active
                        ? 'interactive-link-static text-gold-light bg-white/[0.03]'
                        : item.premium
                          ? 'text-gold-light hover:bg-gold/[0.08] hover:border-gold/40'
                          : 'text-muted hover:text-secondary hover:bg-white/[0.02]'
                    )}
                  >
                    {active ? (
                      <span className="absolute left-0 top-2 bottom-2 w-px bg-gold/40" aria-hidden />
                    ) : null}
                    {item.premium ? (
                      <span className="block text-[8px] tracking-[0.22em] uppercase text-gold-light/70 mb-1">
                        Executive
                      </span>
                    ) : null}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.04] space-y-3">
          <p className="text-[10px] tracking-caps uppercase text-muted truncate">{user?.email}</p>
          <div className="flex gap-4">
            <Link href="/" className="terminal-link text-[10px] flex-1 text-center">
              Storefront
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="interactive-link text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors flex-1"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
