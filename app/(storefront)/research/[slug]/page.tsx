import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HeaderDividerBeam } from '../../../../components/ui/HeaderDividerBeam';
import {
  getResearchArticleCms,
  getResearchArticlesCms,
} from '../../../../lib/firebase/storefrontCms.server';

interface ResearchPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const articles = await getResearchArticlesCms();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ResearchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getResearchArticleCms(slug);
  if (!article) return {};
  return { title: article.title, description: article.excerpt };
}

export default async function ResearchArticlePage({ params }: ResearchPageProps) {
  const { slug } = await params;
  const article = await getResearchArticleCms(slug);
  if (!article) notFound();

  return (
    <main className="min-h-screen bg-void selection:bg-gold/20 pt-28 pb-20">
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/research" className="terminal-link text-[10px]">
          Research Notes
        </Link>
        <p className="text-[10px] tracking-caps uppercase text-muted mt-10">{article.category}</p>
        <h1 className="text-3xl md:text-4xl font-light mt-3 text-heading tracking-title uppercase">
          {article.title}
        </h1>
        <HeaderDividerBeam delay={1} className="my-8" />
        <p className="text-[10px] tracking-caps uppercase text-muted">{article.publishedAt}</p>
        <div className="mt-10 space-y-6 text-secondary font-light leading-relaxed text-sm">
          {article.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}

