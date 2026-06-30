import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_WORDMARK } from '../../../../lib/brand';
import { getResearchArticlesCms } from '../../../../lib/firebase/storefrontCms.server';
import { HeaderDividerBeam } from '../../../../components/ui/HeaderDividerBeam';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { TerminalPanel } from '../../../../components/ui/TerminalPanel';

export const metadata: Metadata = {
  title: 'Research Notes',
  description: 'Educational research notes on peptide methodology and in-vitro study design.',
};

export const revalidate = 60;

export default async function ResearchIndexPage() {
  const articles = await getResearchArticlesCms();

  return (
    <main className="min-h-screen bg-void selection:bg-gold/20 pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <PageHeader
          wordmark={SITE_WORDMARK}
          title="Research Notes"
          subtitle="Educational · Not Medical Advice"
          align="left"
        />
        <p className="text-secondary font-light mt-6 text-sm leading-relaxed">
          Educational content for laboratory teams.
        </p>
        <HeaderDividerBeam delay={1} className="my-10" />
        <div className="space-y-px bg-white/[0.04]">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/research/${article.slug}`}
              className="group block bg-void p-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/30"
            >
              <TerminalPanel hoverBeam className="p-8">
                <p className="text-[10px] tracking-caps uppercase text-muted">{article.category}</p>
                <h2 className="text-lg font-light text-heading mt-2 group-hover:text-gold-light transition-colors">
                  {article.title}
                </h2>
                <p className="text-sm text-secondary font-light mt-3 leading-relaxed">{article.excerpt}</p>
              </TerminalPanel>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

