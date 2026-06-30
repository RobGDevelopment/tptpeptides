import { redirect } from 'next/navigation';
import { getMedicalIntakeById } from '../../../../../features/admin/actions/wellnessActions';
import {
  WellnessIntakeChartView,
  WellnessIntakeNotFound,
} from '../../../../../features/admin/components/wellness/WellnessIntakeChartView';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';

interface AdminWellnessIntakeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminWellnessIntakeDetailPage({
  params,
}: AdminWellnessIntakeDetailPageProps) {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    redirect('/admin');
  }

  const { id } = await params;

  let intake: Awaited<ReturnType<typeof getMedicalIntakeById>> = null;
  let loadError: string | null = null;

  try {
    intake = await getMedicalIntakeById(id);
  } catch (caught) {
    loadError = caught instanceof Error ? caught.message : 'Unable to load medical intake.';
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <WellnessIntakeNotFound />
        <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {loadError}
        </div>
      </div>
    );
  }

  if (!intake) {
    return <WellnessIntakeNotFound />;
  }

  return <WellnessIntakeChartView intake={intake} />;
}
