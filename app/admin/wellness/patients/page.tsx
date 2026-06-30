import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAllPatients } from '../../../../features/admin/actions/wellnessActions';
import { AdminPageHeader } from '../../../../components/ui/AdminPageHeader';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

function formatPatientName(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}

function formatDob(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });
}

function formatCreatedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function AdminWellnessPatientsPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    redirect('/admin');
  }

  let patients: Awaited<ReturnType<typeof getAllPatients>> = [];
  let loadError: string | null = null;

  try {
    patients = await getAllPatients();
  } catch (caught) {
    loadError = caught instanceof Error ? caught.message : 'Unable to load patients.';
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Patients"
        subtitle="Clinic patient profiles from Supabase (HIPAA-scoped, air-gapped from B2B)."
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
                <th>Patient ID</th>
                <th>Name</th>
                <th>DOB</th>
                <th>Phone</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-10">
                    {loadError ? 'Patient directory unavailable.' : 'No patients registered yet.'}
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="font-mono text-xs text-muted">{patient.id.slice(0, 8)}…</td>
                    <td className="text-primary">
                      {formatPatientName(patient.firstName, patient.lastName)}
                    </td>
                    <td className="text-secondary">{formatDob(patient.dateOfBirth)}</td>
                    <td className="text-secondary">{patient.phone?.trim() || '—'}</td>
                    <td className="text-muted text-xs">{formatCreatedAt(patient.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted font-light">
        Patient charts are reviewed via{' '}
        <Link href="/admin/wellness/intakes" className="text-secondary hover:text-primary">
          Medical Intakes
        </Link>
        .
      </p>
    </div>
  );
}
