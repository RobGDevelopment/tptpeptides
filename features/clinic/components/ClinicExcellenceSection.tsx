import { Icons } from '../../../components/icons';

const PILLARS = [
  {
    title: 'Physician-Led Care',
    body: 'Every protocol is designed and overseen by board-certified clinicians—not algorithms or call centers.',
    icon: Icons.User,
  },
  {
    title: 'Clinical Rigor',
    body: 'Evidence-based weight loss and longevity pathways with labs, follow-up, and measurable outcomes.',
    icon: Icons.Shield,
  },
  {
    title: 'Discreet Delivery',
    body: 'A private telehealth experience built for executives and high-net-worth patients who expect discretion.',
    icon: Icons.Check,
  },
] as const;

export function ClinicExcellenceSection() {
  return (
    <section className="clinic-section" aria-labelledby="clinic-excellence-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clinic-section-header">
          <p className="clinic-section-eyebrow">Clinical Excellence</p>
          <h2 id="clinic-excellence-heading" className="clinic-section-title">
            Built for patients who expect institutional-grade care
          </h2>
          <p className="clinic-section-lead">
            TPT Clinic combines physician oversight, modern telehealth infrastructure, and a patient
            experience worthy of a premier medical practice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="clinic-premium-card">
              <div className="clinic-premium-card-icon">
                <pillar.icon />
              </div>
              <h3 className="clinic-premium-card-title">{pillar.title}</h3>
              <p className="clinic-premium-card-body">{pillar.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
