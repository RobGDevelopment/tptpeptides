import Link from 'next/link';
import type { ReactNode } from 'react';
import type {
  MedicalIntakeClinicalQuestionnaire,
  MedicalIntakeDetail,
  MedicalIntakeShippingAddress,
} from '../../actions/wellnessActions';
import { AdminLabUploadForm } from './AdminLabUploadForm';
import { IntakeActions } from './IntakeActions';
import { PatientSecureMessagesPanel } from './PatientSecureMessagesPanel';
import { PrescriptionForm } from './PrescriptionForm';
import { AdminPageHeader } from '../../../../components/ui/AdminPageHeader';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDob(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });
}

function formatPatientName(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}

function formatShippingAddress(address: MedicalIntakeShippingAddress | null): string {
  if (!address) return '—';

  const lines = [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(', '),
    address.postal_code,
    address.country,
  ].filter((line) => line && line.trim().length > 0);

  return lines.length > 0 ? lines.join('\n') : '—';
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'approved'
      ? 'text-gold-light'
      : status === 'rejected'
        ? 'text-red-400'
        : status === 'in_review'
          ? 'text-secondary'
          : 'text-muted';

  return (
    <span className={`text-[10px] tracking-caps uppercase ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-3">
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

function QuestionnaireSection({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <DataField label={label} value={value?.trim() ? value : 'Not provided'} />
  );
}

function renderQuestionnaireSections(questionnaire: MedicalIntakeClinicalQuestionnaire) {
  return (
    <>
      <QuestionnaireSection label="Medical History" value={questionnaire.medicalHistory} />
      <QuestionnaireSection label="Allergies" value={questionnaire.allergies} />
      <QuestionnaireSection
        label="Current Medications"
        value={questionnaire.currentMedications}
      />
      <QuestionnaireSection label="Additional Notes" value={questionnaire.additionalNotes} />
    </>
  );
}

export function WellnessIntakeChartView({ intake }: { intake: MedicalIntakeDetail }) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Clinical Review"
        subtitle={`Intake ${intake.id.slice(0, 8)}… · Submitted ${formatDateTime(intake.submittedAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge status={intake.status} />
            <PatientSecureMessagesPanel
              patientId={intake.patientId}
              patientName={formatPatientName(intake.patient.firstName, intake.patient.lastName)}
            />
            <Link
              href="/admin/wellness/intakes"
              className="text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors"
            >
              ← Back to Queue
            </Link>
          </div>
        }
      />

      <div className="rounded-sm border border-white/[0.06] bg-surface/10 p-5">
        <p className="text-xs text-muted mb-3">Provider Actions</p>
        <IntakeActions
          intakeId={intake.id}
          currentStatus={intake.status}
          redirectTo="/admin/wellness/intakes"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Patient Demographics">
          <dl className="space-y-4">
            <DataField
              label="Full Name"
              value={formatPatientName(intake.patient.firstName, intake.patient.lastName)}
            />
            <DataField label="Date of Birth" value={formatDob(intake.patient.dateOfBirth)} />
            <DataField label="Phone" value={intake.patient.phone?.trim() || '—'} />
            <DataField
              label="Shipping Address"
              value={formatShippingAddress(intake.patient.shippingAddress)}
            />
          </dl>
        </ChartCard>

        <ChartCard title="Consent Audit">
          {intake.consent ? (
            <dl className="space-y-4">
              <DataField label="Consent Version" value={intake.consent.consentVersion} />
              <DataField label="Agreed At" value={formatDateTime(intake.consent.agreedAt)} />
            </dl>
          ) : (
            <p className="text-sm text-muted">No telehealth consent record on file for this patient.</p>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Clinical Questionnaire">
        <dl className="space-y-5">{renderQuestionnaireSections(intake.clinicalQuestionnaire)}</dl>
      </ChartCard>

      <ChartCard title="Lab Results">
        <p className="text-sm text-secondary font-light mb-4">
          Upload biomarker reports to the patient&apos;s secure chart. Files are stored in the
          private clinic labs bucket and released to the patient portal.
        </p>
        <AdminLabUploadForm patientId={intake.patientId} />
      </ChartCard>

      {intake.status === 'approved' ? (
        <ChartCard title="Treatment Plan / Prescription">
          <p className="text-sm text-secondary font-light mb-4">
            Issue a treatment plan for pharmacy routing once clinical review is complete.
          </p>
          <PrescriptionForm patientId={intake.patientId} intakeId={intake.id} />
        </ChartCard>
      ) : null}

      <div className="rounded-sm border border-white/[0.06] bg-surface/10 p-5">
        <p className="text-xs text-muted mb-3">Finalize Review</p>
        <IntakeActions
          intakeId={intake.id}
          currentStatus={intake.status}
          redirectTo="/admin/wellness/intakes"
        />
      </div>
    </div>
  );
}

export function WellnessIntakeNotFound() {
  return (
    <div className="space-y-6 pt-6">
      <AdminPageHeader title="404 — Intake Not Found" subtitle="This medical intake does not exist or was removed." />
      <div className="rounded-sm border border-white/[0.06] bg-surface/20 p-8 text-center space-y-4">
        <p className="text-sm text-muted">
          The intake ID may be invalid, or the record is unavailable in Supabase.
        </p>
        <Link
          href="/admin/wellness/intakes"
          className="inline-block text-[10px] tracking-caps uppercase text-secondary hover:text-primary transition-colors"
        >
          Return to Intake Queue
        </Link>
      </div>
    </div>
  );
}
