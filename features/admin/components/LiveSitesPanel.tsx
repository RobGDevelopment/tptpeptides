import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LiveSitesSnapshot } from '../../../lib/tenant/liveSites.server';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="terminal-link text-sm"
    >
      {children}
    </a>
  );
}

export function LiveSitesPanel({ sites }: { sites: LiveSitesSnapshot }) {
  const cards = [
  sites.b2b,
  ...(sites.clinic ? [sites.clinic] : []),
];

  return (
    <section className="admin-table-section">
      <div className="p-6 border-b border-white/[0.04] space-y-3">
        <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Live Sites</h2>
        <HeaderDividerBeam delay={1} />
        <p className="text-sm text-secondary font-light">
          Open each tenant lane in a new tab. Edit B2B merchandising and clinic operations from this
          back office.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/[0.04]">
        {cards.map((site) => (
          <div key={site.label} className="bg-void p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-primary font-light">{site.label}</p>
              <p className="text-sm text-secondary font-light">{site.description}</p>
            </div>
            <p className="text-xs font-mono text-muted">{site.host}</p>
            <div className="flex flex-wrap gap-4">
              <ExternalLink href={site.url}>Open live site ↗</ExternalLink>
              {site.label === sites.b2b.label ? (
                <Link href="/admin/storefront" className="terminal-link text-sm">
                  Edit storefront CMS
                </Link>
              ) : (
                <>
                  <Link href="/admin/wellness/settings" className="terminal-link text-sm">
                    Edit clinic landing
                  </Link>
                  <Link href="/admin/wellness/intakes" className="terminal-link text-sm">
                    Intake queue
                  </Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-white/[0.04] space-y-3">
        <p className="text-xs text-muted font-light">
          Admin hub:{' '}
          <ExternalLink href={sites.admin.url}>{sites.admin.host}/admin</ExternalLink>
          {' · '}
          Clinic hosts on a separate Vercel alias must be listed in{' '}
          <span className="font-mono text-secondary">NEXT_PUBLIC_CLINIC_SITE_URL</span> or{' '}
          <span className="font-mono text-secondary">TENANT_CLINIC_HOSTS</span>.
        </p>
        {!sites.telehealthEnabled ? (
          <p className="text-xs text-gold-light/80">
            Telehealth module is off. Enable it in{' '}
            <Link href="/admin/modules" className="terminal-link">
              Module Control Center
            </Link>{' '}
            to surface the clinic lane.
          </p>
        ) : null}
      </div>
    </section>
  );
}
