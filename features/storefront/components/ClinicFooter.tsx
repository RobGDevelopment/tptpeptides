import Link from 'next/link';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { isExternalUrl } from '../../../lib/tenant/content';

function TermsLink({ href }: { href: string }) {
  const className =
    'text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors duration-200 clinic-footer-link';

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

const CLINIC_FOOTER_LINKS = [
  { href: '/intake', label: 'Medical Intake' },
  { href: '/dashboard', label: 'Patient Dashboard' },
  { href: '/privacy', label: 'Privacy' },
] as const;

export function ClinicFooter({
  tagline,
  supportEmail,
  termsUrl,
  brandName = 'TPT Wellness',
}: {
  tagline: string;
  supportEmail: string;
  termsUrl: string;
  brandName?: string;
}) {
  return (
    <footer className="mt-auto relative border-t border-black/[0.06]">
      <HeaderDividerBeam delay={3} className="mb-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-[10px] tracking-caps uppercase text-muted text-center mb-6">{tagline}</p>
        <p className="text-[10px] tracking-caps uppercase text-muted text-center mb-6">
          Support:{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="text-secondary hover:text-[var(--theme-primary)] transition-colors clinic-footer-link"
          >
            {supportEmail}
          </a>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[10px] tracking-caps uppercase text-muted/80">
            © {new Date().getFullYear()} {brandName} · Telehealth services
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {CLINIC_FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors duration-200 clinic-footer-link"
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
