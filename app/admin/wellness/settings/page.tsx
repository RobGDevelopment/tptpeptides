import { redirect } from 'next/navigation';
import { getClinicLandingContent } from '../../../../features/admin/actions/clinicContentActions';
import { getClinicDomains } from '../../../../features/admin/actions/domainActions';
import { ClinicLandingStudio } from '../../../../features/admin/components/wellness/ClinicLandingStudio';
import { DomainManagerForm } from '../../../../features/admin/components/wellness/DomainManagerForm';
import { AdminPageHeader } from '../../../../components/ui/AdminPageHeader';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import { getClinicSiteUrlFromEnv } from '../../../../lib/tenant/liveSites.edge';
import { CLINIC_SUPPORT_EMAIL } from '../../../../lib/tenant/constants';

export default async function AdminWellnessSettingsPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isTelehealthEnabled')) {
    redirect('/admin');
  }

  let domains: string[] = [];
  let loadError: string | null = null;
  let landingContent: Awaited<ReturnType<typeof getClinicLandingContent>> | null = null;

  try {
    [domains, landingContent] = await Promise.all([getClinicDomains(), getClinicLandingContent()]);
  } catch (caught) {
    loadError = caught instanceof Error ? caught.message : 'Unable to load clinic settings.';
  }

  const liveClinicUrl = getClinicSiteUrlFromEnv() ?? undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Clinic Settings"
        subtitle="Design the telehealth storefront with live preview, then publish when ready."
      />

      {loadError ? (
        <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {loadError}
        </div>
      ) : null}

      {landingContent ? (
        <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-3">
            <h2 className="text-[10px] tracking-caps uppercase text-muted">Clinic Landing Studio</h2>
          </div>
          <div className="p-5">
            <ClinicLandingStudio
              initialContent={landingContent}
              liveClinicUrl={liveClinicUrl}
              supportEmail={CLINIC_SUPPORT_EMAIL}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-[10px] tracking-caps uppercase text-muted">Domain Management</h2>
        </div>
        <div className="p-5 space-y-6">
          <DomainManagerForm />

          <div className="border-t border-white/[0.06] pt-5 space-y-3">
            <p className="text-[10px] tracking-caps uppercase text-muted">Registered Clinic Hosts</p>
            {domains.length === 0 ? (
              <p className="text-sm text-muted">No clinic domains configured.</p>
            ) : (
              <ul className="space-y-2">
                {domains.map((host) => (
                  <li
                    key={host}
                    className="text-sm text-secondary font-mono px-3 py-2 rounded-sm border border-white/[0.06] bg-surface/30"
                  >
                    {host}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
