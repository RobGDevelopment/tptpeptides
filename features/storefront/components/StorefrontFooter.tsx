import Link from 'next/link';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { SITE_LEGAL_NAME } from '../../../lib/brand';

const FOOTER_LINKS = [
  { href: '/catalog', label: 'Catalog' },
  { href: '/research', label: 'Research' },
  { href: '/lab-results', label: 'Lab Results' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/research-policy', label: 'RUO Policy' },
] as const;

export function StorefrontFooter({ tagline }: { tagline: string }) {
  return (
    <footer className="mt-auto relative">
      <HeaderDividerBeam delay={3} className="mb-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-[10px] tracking-caps uppercase text-muted text-center mb-6">
          {tagline}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[10px] tracking-caps uppercase text-muted/80">
            © {new Date().getFullYear()} {SITE_LEGAL_NAME} · Research use only
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10px] tracking-caps uppercase text-muted hover:text-gold-light transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
