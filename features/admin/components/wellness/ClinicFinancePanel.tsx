import type { ClinicFinanceMetrics } from '../../actions/financeActions';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCents(value: number): string {
  return currency.format(value / 100);
}

function formatSignedCents(value: number): string {
  const formatted = formatCents(Math.abs(value));
  if (value < 0) return `(${formatted})`;
  return formatted;
}

type ClinicFinancePanelProps = {
  metrics: ClinicFinanceMetrics;
};

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-sm border border-white/[0.08] bg-void/20 px-5 py-4">
      <p className="text-[10px] tracking-caps uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-light text-primary tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-secondary font-light">{hint}</p>
    </article>
  );
}

export function ClinicFinancePanel({ metrics }: ClinicFinancePanelProps) {
  const qboAttentionCount = metrics.qboPendingCount + metrics.qboFailedCount;

  return (
    <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[10px] tracking-caps uppercase text-muted">Clinic Financial Ledger</h2>
          <p className="mt-1 text-xs text-secondary font-light">
            NMI clearing account residual and rolling reserve holdings (read-only).
          </p>
        </div>
        <p className="text-[10px] tracking-caps uppercase text-muted">
          Updated{' '}
          {new Date(metrics.lastUpdatedAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="NMI Clearing Residual"
          value={formatSignedCents(metrics.nmiClearingBalanceCents)}
          hint="Net asset balance in the processor clearing account after gross charges, fees, and settlements."
        />
        <MetricCard
          label="Rolling Reserve Holdings"
          value={formatSignedCents(metrics.rollingReserveBalanceCents)}
          hint="Processor-held reserve balance tracked as a current asset in the clinic ledger."
        />
        <MetricCard
          label="QBO Sync Queue — Pending"
          value={String(metrics.qboPendingCount)}
          hint="Journal entry groups waiting for monthly QuickBooks export."
        />
        <MetricCard
          label="QBO Sync — Needs Attention"
          value={String(qboAttentionCount)}
          hint={`${metrics.qboFailedCount} failed · ${metrics.qboProcessingCount} processing · ${metrics.qboSyncedCount} synced`}
        />
      </div>
    </section>
  );
}
