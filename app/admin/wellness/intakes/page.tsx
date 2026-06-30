import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMedicalIntakes } from '../../../../features/admin/actions/wellnessActions';
import { IntakeActions } from '../../../../features/admin/components/wellness/IntakeActions';
import { AdminPageHeader } from '../../../../components/ui/AdminPageHeader';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

function formatDate(value: string | null): string {
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

export default async function AdminWellnessIntakesPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    redirect('/admin');
  }

  let intakes: Awaited<ReturnType<typeof getMedicalIntakes>> = [];
  let loadError: string | null = null;

  try {
    intakes = await getMedicalIntakes();
  } catch (caught) {
    loadError = caught instanceof Error ? caught.message : 'Unable to load medical intakes.';
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Medical Intakes"
        subtitle="Review asynchronous clinical questionnaires from the telehealth clinic (Supabase)."
      />

      {loadError ? (
        <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {loadError}
        </div>
      ) : null}

      <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Intake ID</th>
                <th>Patient</th>
                <th>DOB</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {intakes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-10">
                    {loadError ? 'Intake queue unavailable.' : 'No medical intakes submitted yet.'}
                  </td>
                </tr>
              ) : (
                intakes.map((intake) => (
                  <tr key={intake.id}>
                    <td className="font-mono text-xs">
                      <Link
                        href={`/admin/wellness/intakes/${intake.id}`}
                        className="text-muted hover:text-primary transition-colors"
                      >
                        {intake.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="text-primary">
                      {formatPatientName(intake.firstName, intake.lastName)}
                    </td>
                    <td className="text-secondary">{formatDob(intake.dateOfBirth)}</td>
                    <td>
                      <StatusBadge status={intake.status} />
                    </td>
                    <td className="text-muted text-xs">{formatDate(intake.submittedAt)}</td>
                    <td>
                      <IntakeActions intakeId={intake.id} currentStatus={intake.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
