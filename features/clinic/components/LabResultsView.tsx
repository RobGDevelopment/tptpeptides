import type { ClinicLabResult } from '../../../lib/schemas/clinicCare';

type LabResultsViewProps = {
  labs: ClinicLabResult[];
};

function statusLabel(status: ClinicLabResult['status']): string {
  return status === 'reviewed' ? 'Reviewed' : 'Pending review';
}

export function LabResultsView({ labs }: LabResultsViewProps) {
  if (labs.length === 0) {
    return (
      <section className="rounded-sm border border-black/[0.08] bg-[#fcfcfc]/80 backdrop-blur-sm p-10 text-center shadow-sm">
        <p className="text-[10px] tracking-caps uppercase text-muted mb-3">Lab Results</p>
        <p className="text-sm text-secondary font-light max-w-md mx-auto">
          No biomarker data on file. Your provider will order labs if required by your protocol.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-sm border border-black/[0.08] bg-[#fcfcfc]/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <div className="border-b border-black/[0.06] px-5 py-3">
        <h2 className="text-[10px] tracking-caps uppercase text-muted">Lab Results</h2>
      </div>
      <ul className="divide-y divide-black/[0.06]">
        {labs.map((lab) => (
          <li key={lab.id} className="p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm text-primary font-medium">{lab.title}</h3>
                <p className="text-[10px] tracking-caps uppercase text-muted mt-1">
                  {statusLabel(lab.status)} ·{' '}
                  {new Date(lab.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>
              <a
                href={lab.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="terminal-link text-sm"
              >
                View report
              </a>
            </div>
            {lab.providerNotes ? (
              <p className="text-sm text-secondary font-light whitespace-pre-wrap">
                {lab.providerNotes}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
