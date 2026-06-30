import { redirect } from 'next/navigation';
import { getAllPrescriptions } from '../../../../features/admin/actions/prescriptionActions';
import { PrescriptionDispatchButton } from '../../../../features/admin/components/wellness/PrescriptionDispatchButton';
import { AdminPageHeader } from '../../../../components/ui/AdminPageHeader';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';

function formatPatientName(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}

function formatDateWritten(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function PrescriptionStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'text-gold-light'
      : status === 'cancelled'
        ? 'text-red-400'
        : 'text-secondary';

  return (
    <span className={`text-[10px] tracking-caps uppercase ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default async function AdminWellnessPrescriptionsPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    redirect('/admin');
  }

  let prescriptions: Awaited<ReturnType<typeof getAllPrescriptions>> = [];
  let loadError: string | null = null;

  try {
    prescriptions = await getAllPrescriptions();
  } catch (caught) {
    loadError = caught instanceof Error ? caught.message : 'Unable to load prescriptions.';
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Prescriptions"
        subtitle="Provider-issued treatment plans routed to OpenLoop MSO or compounding pharmacy."
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
                <th>Prescription ID</th>
                <th>Patient</th>
                <th>Medication</th>
                <th>Status</th>
                <th>Date Written</th>
                <th>Dispatch</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-10">
                    {loadError
                      ? 'Prescription queue unavailable.'
                      : 'No prescriptions issued yet.'}
                  </td>
                </tr>
              ) : (
                prescriptions.map((prescription) => (
                  <tr key={prescription.id}>
                    <td className="font-mono text-xs text-muted">
                      {prescription.id.slice(0, 8)}…
                    </td>
                    <td className="text-primary">
                      {formatPatientName(prescription.firstName, prescription.lastName)}
                    </td>
                    <td className="text-secondary">{prescription.medicationName}</td>
                    <td>
                      <PrescriptionStatusBadge status={prescription.status} />
                    </td>
                    <td className="text-muted text-xs">
                      {formatDateWritten(prescription.createdAt)}
                    </td>
                    <td>
                      <PrescriptionDispatchButton
                        prescriptionId={prescription.id}
                        dispatchStatus={prescription.dispatchStatus}
                        externalRxId={prescription.externalRxId}
                      />
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
