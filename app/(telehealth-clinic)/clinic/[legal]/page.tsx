import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { HeaderDividerBeam } from '../../../../components/ui/HeaderDividerBeam';
import {
  CLINIC_LEGAL_DOCUMENTS,
  CLINIC_LEGAL_SLUGS,
  isClinicLegalSlug,
  type ClinicLegalSlug,
} from '../../../../features/clinic/content/clinicLegalContent';

interface ClinicLegalPageProps {
  params: Promise<{ legal: string }>;
}

export function generateStaticParams() {
  return CLINIC_LEGAL_SLUGS.map((legal) => ({ legal }));
}

export async function generateMetadata({ params }: ClinicLegalPageProps): Promise<Metadata> {
  const { legal } = await params;
  if (!isClinicLegalSlug(legal)) return {};

  const doc = CLINIC_LEGAL_DOCUMENTS[legal];
  return {
    title: doc.title,
    description: doc.subtitle,
  };
}

export default async function ClinicLegalPage({ params }: ClinicLegalPageProps) {
  const { legal } = await params;
  if (!isClinicLegalSlug(legal)) notFound();

  const doc = CLINIC_LEGAL_DOCUMENTS[legal as ClinicLegalSlug];

  return (
    <article className="max-w-3xl mx-auto px-4 py-16 lg:py-20">
      <Link href="/" className="text-[10px] tracking-caps uppercase text-muted hover:text-[var(--theme-primary)] transition-colors">
        ← Back to home
      </Link>

      <header className="mt-10 mb-10">
        <p className="text-[10px] tracking-caps uppercase text-muted">Legal</p>
        <h1 className="text-3xl md:text-4xl font-light mt-3 text-heading tracking-title uppercase">
          {doc.title}
        </h1>
        <HeaderDividerBeam delay={1} className="my-6" />
        <p className="text-secondary font-light text-sm">{doc.subtitle}</p>
        <p className="text-[10px] tracking-caps uppercase text-muted mt-4">Last updated: {doc.lastUpdated}</p>
      </header>

      <div className="space-y-10">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-sm tracking-caps uppercase text-heading font-medium mb-4">{section.heading}</h2>
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
