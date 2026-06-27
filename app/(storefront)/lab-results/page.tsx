import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_WORDMARK } from '../../../lib/brand';
import { getCatalogEntries } from '../../../lib/catalog';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { PageHeader } from '../../../components/ui/PageHeader';
import { TerminalPanel } from '../../../components/ui/TerminalPanel';

export const metadata: Metadata = {
  title: 'Lab Results & COA Library',
  description: `Certificates of Analysis and third-party HPLC testing documentation for ${SITE_NAME} research compounds.`,
};

const QA_STANDARDS = [
  {
    title: 'Third-Party HPLC',
    body: 'Every batch is verified by independent chromatography against reference standards before release.',
  },
  {
    title: 'Mass Spectrometry',
    body: 'Identity confirmation via MS is available for premium SKUs and custom synthesis lots.',
  },
  {
    title: 'Endotoxin Screening',
    body: 'LAL testing is performed on applicable formulations to support sensitive in-vitro workflows.',
  },
  {
    title: 'Batch Traceability',
    body: 'Lot numbers tie directly to fulfillment records for audit-ready procurement documentation.',
  },
] as const;

export default function LabResultsPage() {
  const compounds = getCatalogEntries().slice(0, 12);

  return (
    <main className="min-h-screen bg-void selection:bg-gold/20 pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          wordmark={SITE_WORDMARK}
          title="Lab Results & COA Library"
          subtitle="Quality Assurance · Batch Documentation"
          align="left"
        />

        <p className="text-secondary font-light mt-8 max-w-3xl leading-relaxed text-sm">
          {SITE_NAME} compounds ship with batch-level documentation suitable for institutional procurement and
          internal QA review. Authenticated clients can request full COA packets tied to fulfilled order lot
          numbers.
        </p>

        <div className="grid md:grid-cols-2 gap-px bg-white/[0.04] mt-12">
          {QA_STANDARDS.map((item) => (
            <TerminalPanel key={item.title} className="p-8 bg-void">
              <h2 className="text-sm tracking-widest uppercase text-heading font-medium mb-3">{item.title}</h2>
              <p className="text-sm text-secondary font-light leading-relaxed">{item.body}</p>
            </TerminalPanel>
          ))}
        </div>

        <section className="mt-20">
          <div className="flex items-end justify-between gap-4 mb-8">
            <h2 className="text-xl font-light text-heading tracking-title uppercase">Compound COA Index</h2>
            <Link href="/catalog" className="terminal-link text-[10px]">
              Browse Catalog
            </Link>
          </div>
          <HeaderDividerBeam delay={1} className="mb-10" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
            {compounds.map((entry) => (
              <Link
                key={entry.id}
                href={`/catalog/${entry.id}`}
                className="group block bg-void p-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/30"
              >
                <TerminalPanel hoverBeam className="p-6 h-full">
                  <p className="text-[10px] tracking-widest uppercase text-muted">{entry.category}</p>
                  <h3 className="text-sm text-primary font-light mt-2 group-hover:text-gold-light transition-colors">
                    {entry.name}
                  </h3>
                  <p className="text-[10px] tracking-widest uppercase text-muted mt-3 font-mono">
                    COA on request · HPLC verified
                  </p>
                </TerminalPanel>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <HeaderDividerBeam delay={2} className="mb-8" />
          <h2 className="text-sm tracking-widest uppercase text-heading font-medium mb-3">
            Need a signed COA for an active order?
          </h2>
          <p className="text-sm text-secondary font-light leading-relaxed mb-6 max-w-2xl">
            Sign in to the Client Portal to download batch documentation linked to your shipments, or contact
            support with your PO number.
          </p>
          <Link href="/account" className="terminal-link text-[10px]">
            Open Client Portal
          </Link>
        </section>
      </div>
    </main>
  );
}
