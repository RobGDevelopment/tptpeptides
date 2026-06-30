'use client';

import type { ClinicLabResult, ClinicMessage } from '../../../lib/schemas/clinicCare';
import type { PatientDashboardData } from '../../../lib/schemas/clinicPatientPortal';
import { ClinicDashboardTabs, useClinicDashboardTab } from './ClinicDashboardTabs';
import { ClinicOverviewTab } from './ClinicOverviewTab';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { LabResultsView } from './LabResultsView';
import { SecureMessageCenter } from './SecureMessageCenter';

type ClinicDashboardViewProps = {
  data: PatientDashboardData;
  messages: ClinicMessage[];
  labs: ClinicLabResult[];
};

export function ClinicDashboardView({ data, messages, labs }: ClinicDashboardViewProps) {
  const [activeTab, setActiveTab] = useClinicDashboardTab();

  return (
    <div className="mx-auto max-w-5xl pt-28 pb-20 px-4 sm:px-6">
      <div className="space-y-2 mb-8">
        <p className="text-[10px] tracking-caps uppercase text-muted">Patient Portal</p>
        <h1 className="admin-heading text-2xl">My Care</h1>
        <p className="text-sm text-secondary font-light">
          Your secure dashboard for clinical overview, provider messaging, and lab results.
        </p>
      </div>

      <HeaderDividerBeam delay={1} className="mb-8" />

      <div className="mb-8">
        <ClinicDashboardTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'overview' ? <ClinicOverviewTab data={data} /> : null}
      {activeTab === 'messages' ? <SecureMessageCenter initialMessages={messages} /> : null}
      {activeTab === 'labs' ? <LabResultsView labs={labs} /> : null}
    </div>
  );
}
