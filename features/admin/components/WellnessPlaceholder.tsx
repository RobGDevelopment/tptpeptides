import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';

export function WellnessPlaceholder({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        subtitle={subtitle ?? 'Telehealth operations — Supabase-scoped, isolated from B2B catalog.'}
      />
      <div className="min-h-[240px] rounded-sm border border-white/[0.06] bg-surface/20 p-8">
        <p className="text-sm font-light text-muted">
          Wellness command center scaffolding is active. Patient and intake data will load from Supabase
          in a follow-up sprint.
        </p>
      </div>
    </div>
  );
}
