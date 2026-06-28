import Link from 'next/link';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { SITE_LEGAL_NAME } from '../../../lib/brand';
import { isExternalUrl } from '../../../lib/tenant/content';

const BASE_FOOTER_LINKS = [
  { href: '/catalog', label: 'Catalog' },
  { href: '/research', label: 'Research' },
  { href: '/lab-results', label: 'Lab Results' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/research-policy', label: 'RUO Policy' },
] as const;

function TermsLink({ href }: { href: string }) {
  const className =
    'text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors duration-200 interactive-link';

  if (isExternalUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        Terms
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      Terms
    </Link>
  );
}

export function StorefrontFooter({
  tagline,
  supportEmail,
  termsUrl,
}: {
  tagline: string;
  supportEmail: string;
  termsUrl: string;
}) {
  return (
    <footer className="mt-auto relative">
      <HeaderDividerBeam delay={3} className="mb-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-[10px] tracking-caps uppercase text-muted text-center mb-6">
          {tagline}
        </p>
        <p className="text-[10px] tracking-caps uppercase text-muted text-center mb-6">
          Support:{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="text-secondary hover:text-gold-light transition-colors interactive-link"
          >
            {supportEmail}
          </a>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[10px] tracking-caps uppercase text-muted/80">
            © {new Date().getFullYear()} {SITE_LEGAL_NAME} · Research use only
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {BASE_FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors duration-200 interactive-link"
              >
                {link.label}
              </Link>
            ))}
            <TermsLink href={termsUrl} />
          </nav>
        </div>
      </div>
    </footer>
  );
}
