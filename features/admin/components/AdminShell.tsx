'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../auth/providers/AuthProvider';
import { cn } from '../../../lib/utils/cn';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { SITE_WORDMARK } from '../../../lib/brand';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/storefront', label: 'Storefront' },
  { href: '/admin/verifications', label: 'Verifications' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/modules', label: 'Modules' },
  { href: '/admin/audit', label: 'Audit Logs' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

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

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative block px-4 py-3 text-sm font-light transition-colors duration-200',
                  active ? 'text-gold-light' : 'text-muted hover:text-secondary'
                )}
              >
                {active ? (
                  <span className="absolute left-0 top-2 bottom-2 w-px bg-gold/40" aria-hidden />
                ) : null}
                {item.label}
              </Link>
            );
          })}
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
              className="text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors flex-1"
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
