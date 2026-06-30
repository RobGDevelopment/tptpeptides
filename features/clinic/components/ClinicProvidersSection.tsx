const STATS = [
  { value: '100%', label: 'Physician-reviewed intakes' },
  { value: 'HIPAA', label: 'End-to-end encryption' },
  { value: '24hr', label: 'Clinical review SLA' },
  { value: '50', label: 'State licensure coverage' },
] as const;

export function ClinicProvidersSection() {
  return (
    <section id="providers" className="clinic-section" aria-labelledby="clinic-providers-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="clinic-section-eyebrow">Provider Network</p>
            <h2 id="clinic-providers-heading" className="clinic-section-title">
              Licensed clinicians. Institutional standards.
            </h2>
            <p className="clinic-section-lead mt-6">
              Our physician network operates under rigorous clinical governance—every prescription and
              protocol follows evidence-based guidelines with full audit visibility for compliance teams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="clinic-stat-card">
                <p className="clinic-stat-value">{stat.value}</p>
                <p className="clinic-stat-label">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
