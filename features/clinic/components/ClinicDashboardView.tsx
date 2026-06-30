import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PatientDashboardData } from '../../../lib/schemas/clinicPatientPortal';
import { PatientProfileSection } from './PatientProfileSection';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';

function formatIntakeStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function IntakeStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'approved'
      ? 'border-gold-light/40 text-gold-light bg-gold-light/5'
      : status === 'rejected'
        ? 'border-red-500/30 text-red-600 bg-red-500/5'
        : status === 'in_review'
          ? 'border-black/10 text-secondary bg-surface/60'
          : 'border-black/10 text-muted bg-surface/40';

  return (
    <span
      className={`inline-block text-[10px] tracking-caps uppercase px-3 py-1 rounded-sm border ${tone}`}
    >
      {formatIntakeStatus(status)}
    </span>
  );
}

function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-black/[0.08] bg-[#fcfcfc]/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <div className="border-b border-black/[0.06] px-5 py-3">
        <h2 className="text-[10px] tracking-caps uppercase text-muted">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-caps uppercase text-muted mb-1">{label}</dt>
      <dd className="text-sm text-primary whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export function ClinicDashboardView({ data }: { data: PatientDashboardData }) {
  return (
    <div className="mx-auto max-w-5xl pt-28 pb-20 px-4 sm:px-6">
      <div className="space-y-2 mb-8">
        <p className="text-[10px] tracking-caps uppercase text-muted">Patient Portal</p>
        <h1 className="admin-heading text-2xl">My Care</h1>
        <p className="text-sm text-secondary font-light">
          Your secure dashboard for intake progress and treatment plans.
        </p>
      </div>

      <HeaderDividerBeam delay={1} className="mb-8" />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Account Profile">
          <PatientProfileSection profile={data.profile} />
        </DashboardCard>

        <DashboardCard title="Medical Intake Status">
          {data.latestIntake ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] tracking-caps uppercase text-muted mb-2">Current Status</p>
                <IntakeStatusBadge status={data.latestIntake.status} />
              </div>
              <DataField
                label="Submitted"
                value={
                  data.latestIntake.submittedAt
                    ? new Date(data.latestIntake.submittedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Not yet submitted'
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted font-light">
                You have not submitted a medical intake yet.
              </p>
              <Link href="/intake" className="terminal-link text-sm">
                Start Medical Intake
              </Link>
            </div>
          )}
        </DashboardCard>
      </div>

      <div className="mt-6">
        <DashboardCard title="Active Prescriptions">
          {data.prescriptions.length === 0 ? (
            <p className="text-sm text-muted font-light">
              No active prescriptions on file. Your provider will issue a treatment plan after
              intake approval.
            </p>
          ) : (
            <ul className="space-y-4">
              {data.prescriptions.map((prescription) => (
                <li
                  key={prescription.id}
                  className="rounded-sm border border-black/[0.06] bg-surface/30 p-4 space-y-2"
                >
                  <p className="text-sm text-primary font-medium">{prescription.medicationName}</p>
                  <p className="text-sm text-secondary whitespace-pre-wrap">
                    {prescription.dosageInstructions}
                  </p>
                  <p className="text-[10px] tracking-caps uppercase text-muted">
                    {formatIntakeStatus(prescription.status)} ·{' '}
                    {new Date(prescription.createdAt).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
