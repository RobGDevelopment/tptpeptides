import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_WORDMARK } from '../../../../lib/brand';
import { getProtocolTemplatesCms } from '../../../../lib/firebase/storefrontCms.server';
import { HeaderDividerBeam } from '../../../../components/ui/HeaderDividerBeam';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { TerminalPanel } from '../../../../components/ui/TerminalPanel';

export const metadata: Metadata = {
  title: 'Research Protocols',
  description: `Structured in-vitro research protocol templates and compound pairing guides for ${SITE_NAME} clients.`,
};

export const revalidate = 60;

export default async function ProtocolsPage() {
  const protocols = await getProtocolTemplatesCms();

  return (
    <main className="min-h-screen bg-void selection:bg-gold/20 pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          wordmark={SITE_WORDMARK}
          title="Protocol Templates"
          subtitle="Research Library · In-Vitro Frameworks"
          align="left"
        />

        <p className="text-secondary font-light mt-8 max-w-3xl leading-relaxed text-sm">
          Curated starting points for in-vitro investigation. These are educational frameworks — not dosing
          guidance. All work must comply with institutional review and {SITE_NAME}&apos;s{' '}
          <Link href="/research-policy" className="interactive-link interactive-link-static text-gold-light transition-colors">
            Research Use Only Policy
          </Link>
          .
        </p>

        <HeaderDividerBeam delay={1} className="my-10" />

        <div className="space-y-px bg-white/[0.04]">
          {protocols.map((protocol) => (
            <TerminalPanel key={protocol.id} className="p-8 lg:p-10 bg-void">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                <div className="max-w-2xl">
                  <h2 className="text-lg font-light text-heading tracking-title uppercase mb-4">
                    {protocol.title}
                  </h2>
                  <p className="text-sm text-secondary font-light leading-relaxed mb-6">{protocol.focus}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {protocol.compounds.map((compound) => (
                      <span key={compound} className="text-[10px] tracking-caps uppercase text-muted">
                        {compound}
                      </span>
                    ))}
                  </div>
                </div>
                <Link href={protocol.href} className="terminal-link text-[10px] shrink-0">
                  View Compounds
                </Link>
              </div>
            </TerminalPanel>
          ))}
        </div>

        <div className="mt-16 text-center">
          <HeaderDividerBeam delay={2} className="mb-8" />
          <Link href="/catalog" className="terminal-link text-[10px]">
            Explore Full Catalog
          </Link>
        </div>
      </div>
    </main>
  );
}

