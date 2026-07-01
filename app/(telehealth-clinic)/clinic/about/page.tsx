import Link from 'next/link';
import type { Metadata } from 'next';
import { HeaderDividerBeam } from '../../../../components/ui/HeaderDividerBeam';
import { CLINIC_ABOUT_CONTENT } from '../../../../features/clinic/content/clinicAboutContent';
import { CLINIC_SEO } from '../../../../lib/tenant/clinicSeo';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn how TPT Clinic delivers physician-led telehealth with HIPAA-aligned infrastructure, professional licensing, and secure patient portal access.',
  openGraph: {
    title: `About | ${CLINIC_SEO.title}`,
    description: CLINIC_SEO.description,
  },
};

export default function ClinicAboutPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-16 lg:py-20">
      <Link
        href="/"
        className="text-[10px] tracking-caps uppercase text-muted hover:text-[var(--theme-primary)] transition-colors"
      >
        ← Back to home
      </Link>

      <header className="mt-10 mb-10">
        <p className="text-[10px] tracking-caps uppercase text-muted">About</p>
        <h1 className="text-3xl md:text-4xl font-light mt-3 text-heading tracking-title uppercase">
          {CLINIC_ABOUT_CONTENT.title}
        </h1>
        <HeaderDividerBeam delay={1} className="my-6" />
        <p className="text-secondary font-light text-sm">{CLINIC_ABOUT_CONTENT.subtitle}</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 mb-12">
        {CLINIC_ABOUT_CONTENT.trustSignals.map((signal) => (
          <li
            key={signal.label}
            className="rounded-sm border border-black/[0.08] bg-[#fcfcfc]/80 px-4 py-4 shadow-sm"
          >
            <p className="text-[10px] tracking-caps uppercase text-muted mb-1">{signal.label}</p>
            <p className="text-sm text-secondary font-light">{signal.detail}</p>
          </li>
        ))}
      </ul>

      <div className="space-y-10">
        {CLINIC_ABOUT_CONTENT.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-sm tracking-caps uppercase text-heading font-medium mb-4">
              {section.heading}
            </h2>
            <div className="space-y-4">
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-secondary font-light leading-relaxed text-sm"
                >
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
