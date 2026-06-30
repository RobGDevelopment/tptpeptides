const STEPS = [
  {
    step: '01',
    title: 'Private Intake',
    body: 'Complete a secure medical questionnaire. Our clinical team reviews your history within one business day.',
  },
  {
    step: '02',
    title: 'Physician Consultation',
    body: 'Meet with a licensed provider via telehealth to confirm eligibility and personalize your protocol.',
  },
  {
    step: '03',
    title: 'Ongoing Oversight',
    body: 'Track progress in your patient portal with scheduled follow-ups and protocol adjustments as needed.',
  },
] as const;

export function ClinicProcessSection() {
  return (
    <section id="how-it-works" className="clinic-section clinic-section-muted" aria-labelledby="clinic-process-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clinic-section-header">
          <p className="clinic-section-eyebrow">How It Works</p>
          <h2 id="clinic-process-heading" className="clinic-section-title">
            A refined path from intake to outcomes
          </h2>
        </div>

        <ol className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
          {STEPS.map((item) => (
            <li key={item.step} className="clinic-process-step">
              <span className="clinic-process-index">{item.step}</span>
              <h3 className="clinic-process-title">{item.title}</h3>
              <p className="clinic-process-body">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
