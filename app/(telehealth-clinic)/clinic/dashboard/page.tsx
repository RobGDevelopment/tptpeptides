import type { Metadata } from 'next';
import { getPatientLabs, getPatientMessages } from '../../../../features/clinic/actions/careActions';
import { getPatientDashboardData } from '../../../../features/clinic/actions/patientPortalActions';
import { ClinicDashboardGate } from '../../../../features/clinic/components/ClinicDashboardGate';
import { ClinicDashboardView } from '../../../../features/clinic/components/ClinicDashboardView';

export const metadata: Metadata = {
  title: 'My Care',
  description: 'View your medical intake status, profile, prescriptions, messages, and lab results.',
};

export default async function ClinicDashboardPage() {
  let data: Awaited<ReturnType<typeof getPatientDashboardData>> = null;
  let messages: Awaited<ReturnType<typeof getPatientMessages>> = [];
  let labs: Awaited<ReturnType<typeof getPatientLabs>> = [];
  let loadError: string | null = null;

  try {
    data = await getPatientDashboardData();
    if (data) {
      [messages, labs] = await Promise.all([getPatientMessages(), getPatientLabs()]);
    }
  } catch (caught) {
    loadError = caught instanceof Error ? caught.message : 'Unable to load your care dashboard.';
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg pt-28 pb-20 px-4">
        <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">
          {loadError}
        </div>
      </div>
    );
  }

  if (!data) {
    return <ClinicDashboardGate />;
  }

  return <ClinicDashboardView data={data} messages={messages} labs={labs} />;
}
