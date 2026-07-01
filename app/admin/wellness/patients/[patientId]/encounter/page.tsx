import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { EncounterCommandCenter } from '../../../../../../features/clinic/components/EncounterCommandCenter';
import { AdminAuthError, requireAdminSession } from '../../../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../../lib/modules/flags';
import { createAdminClient } from '../../../../../../lib/supabase/admin';

interface AdminWellnessPatientEncounterPageProps {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ intakeId?: string }>;
}

export default async function AdminWellnessPatientEncounterPage({
  params,
  searchParams,
}: AdminWellnessPatientEncounterPageProps) {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    redirect('/admin');
  }

  const { patientId } = await params;
  const { intakeId } = await searchParams;

  let providerUid = '';
  let providerDisplayName = 'Provider';
  let authError: string | null = null;

  try {
    const headersList = await headers();
    const session = await requireAdminSession(
      new Request('http://internal/admin/wellness/encounters', { headers: headersList })
    );
    providerUid = session.uid;
    providerDisplayName = session.email?.split('@')[0] ?? 'Provider';
  } catch (caught) {
    authError =
      caught instanceof AdminAuthError
        ? caught.message
        : caught instanceof Error
          ? caught.message
          : 'Admin session required.';
  }

  if (authError) {
    return (
      <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
        {authError}
      </div>
    );
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('patient_profiles')
    .select('first_name, last_name')
    .eq('id', patientId)
    .maybeSingle();

  const patientLabel = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();

  return (
    <EncounterCommandCenter
      patientId={patientId}
      medicalIntakeId={intakeId ?? null}
      providerUid={providerUid}
      providerDisplayName={providerDisplayName}
      patientLabel={patientLabel || patientId.slice(0, 8)}
    />
  );
}
