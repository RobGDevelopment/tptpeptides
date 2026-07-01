import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { EncounterCommandCenter } from '../../../../../features/clinic/components/EncounterCommandCenter';
import { AdminAuthError, requireAdminSession } from '../../../../../lib/firebase/adminAuth.server';
import { getModuleFlags } from '../../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../../lib/modules/flags';

interface AdminWellnessEncounterPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminWellnessEncounterPage({
  params,
}: AdminWellnessEncounterPageProps) {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    redirect('/admin');
  }

  const { id } = await params;

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

  return (
    <EncounterCommandCenter
      encounterId={id}
      providerUid={providerUid}
      providerDisplayName={providerDisplayName}
    />
  );
}
