import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MetallicBeam } from '../../../components/ui/MetallicBeam';
import {
  isLegalSlug,
  LEGAL_DOCUMENTS,
  LEGAL_SLUGS,
  type LegalSlug,
} from '../../../features/storefront/content/legalContent';

interface LegalPageProps {
  params: Promise<{ legal: string }>;
}

export function generateStaticParams() {
  return LEGAL_SLUGS.map((legal) => ({ legal }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { legal } = await params;
  if (!isLegalSlug(legal)) return {};

  const doc = LEGAL_DOCUMENTS[legal];
  return {
    title: doc.title,
    description: doc.subtitle,
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { legal } = await params;
  if (!isLegalSlug(legal)) notFound();

  const doc = LEGAL_DOCUMENTS[legal as LegalSlug];

  return (
    <article className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="terminal-link text-[10px]">
        Back to Storefront
      </Link>

      <header className="mt-10 mb-10">
        <p className="text-[10px] tracking-caps uppercase text-muted">Legal</p>
        <h1 className="text-3xl md:text-4xl font-light mt-3 text-primary tracking-title uppercase">
          {doc.title}
        </h1>
        <MetallicBeam variant="horizontal" className="my-6 max-w-24" />
        <p className="text-secondary font-light text-sm">{doc.subtitle}</p>
        <p className="text-[10px] tracking-caps uppercase text-muted mt-4">Last updated: {doc.lastUpdated}</p>
      </header>

      <div className="space-y-10">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-sm tracking-caps uppercase text-primary font-medium mb-4">{section.heading}</h2>
            <div className="space-y-4">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="text-secondary font-light leading-relaxed text-sm">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
