import Link from 'next/link';
import type { AdminModuleLink } from '../../../lib/modules/adminModuleLinks';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';

export function EnabledModulesPanel({ modules }: { modules: AdminModuleLink[] }) {
  if (modules.length === 0) {
    return (
      <section className="admin-table-section">
        <div className="p-6 border-b border-white/[0.04] space-y-3">
          <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Enabled Modules</h2>
          <HeaderDividerBeam delay={2} />
        </div>
        <div className="p-6">
          <p className="text-sm text-secondary font-light">
            No optional modules are active. Open{' '}
            <Link href="/admin/modules" className="terminal-link">
              Module Control Center
            </Link>{' '}
            to enable B2B procurement, accounting export, user management, and more.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-table-section">
      <div className="p-6 border-b border-white/[0.04] space-y-3">
        <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Enabled Modules</h2>
        <HeaderDividerBeam delay={2} />
        <p className="text-sm text-secondary font-light">
          Active feature modules with quick links to their admin surfaces.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.04]">
        {modules.map((module) => (
          <Link
            key={`${module.phase}-${module.label}`}
            href={module.href}
            className="block bg-void p-6 hover:bg-surface/20 transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <p className="text-primary font-light group-hover:text-gold-light transition-colors">
                  {module.label}
                </p>
                <p className="text-sm text-secondary font-light">{module.description}</p>
              </div>
              <span className="shrink-0 text-[10px] tracking-caps uppercase text-muted border border-white/[0.06] px-2 py-1">
                Phase {module.phase}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
