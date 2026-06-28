'use client';

import { ProformaProvider, useProforma } from '../../../lib/finance/ProformaContext';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[10px] tracking-caps uppercase text-muted">{label}</span>
        <span className="text-sm text-primary font-light tabular-nums">
          {suffix === '$' ? currency.format(value) : `${value}${suffix ?? ''}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--color-gold-light,#c9a962)]"
      />
    </label>
  );
}

function ProformaWorkspace() {
  const { variables, setVariable, resetVariables, waterfall } = useProforma();

  const rows = [
    { label: 'Gross revenue', value: waterfall.grossRevenue },
    { label: 'Revenue after churn', value: waterfall.revenueAfterChurn },
    { label: 'COGS', value: -waterfall.cogs },
    { label: 'Gross profit', value: waterfall.grossProfit },
    { label: 'Merchant fees', value: -waterfall.merchantFees },
    { label: 'CAC', value: -waterfall.cac },
    { label: 'OpEx', value: -waterfall.opex },
    { label: 'EBITDA', value: waterfall.ebitda, highlight: true },
    { label: `GP distribution (${variables.gpSplitPercent}%)`, value: waterfall.gpDistribution },
    { label: `LP distribution (${variables.lpSplitPercent}%)`, value: waterfall.lpDistribution },
    { label: 'Retained EBITDA', value: waterfall.retainedEbitda },
  ];

  return (
    <div className="space-y-10 max-w-4xl">
      <AdminPageHeader
        title="Proforma Underwriting"
        subtitle="Model monthly revenue through EBITDA and GP/LP profit splits. Adjust sliders to stress-test CAC, COGS, fees, and churn."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="border border-white/[0.06] rounded-sm p-6 space-y-6">
          <h2 className="text-[10px] tracking-caps uppercase text-muted">Scenario inputs</h2>
          <SliderControl
            label="Gross revenue"
            value={variables.grossRevenue}
            min={50_000}
            max={1_000_000}
            step={5_000}
            suffix="$"
            onChange={(value) => setVariable('grossRevenue', value)}
          />
          <SliderControl
            label="Customer acquisition cost"
            value={variables.cac}
            min={0}
            max={50_000}
            step={500}
            suffix="$"
            onChange={(value) => setVariable('cac', value)}
          />
          <SliderControl
            label="COGS % of revenue"
            value={variables.cogsPercent}
            min={20}
            max={70}
            step={0.5}
            suffix="%"
            onChange={(value) => setVariable('cogsPercent', value)}
          />
          <SliderControl
            label="Merchant fees %"
            value={variables.merchantFeePercent}
            min={0}
            max={8}
            step={0.1}
            suffix="%"
            onChange={(value) => setVariable('merchantFeePercent', value)}
          />
          <SliderControl
            label="Monthly churn %"
            value={variables.churnPercent}
            min={0}
            max={15}
            step={0.25}
            suffix="%"
            onChange={(value) => setVariable('churnPercent', value)}
          />
          <SliderControl
            label="Fixed OpEx"
            value={variables.opex}
            min={0}
            max={150_000}
            step={1_000}
            suffix="$"
            onChange={(value) => setVariable('opex', value)}
          />
          <SliderControl
            label="GP profit split"
            value={variables.gpSplitPercent}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={(value) => setVariable('gpSplitPercent', value)}
          />
          <SliderControl
            label="LP profit split"
            value={variables.lpSplitPercent}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={(value) => setVariable('lpSplitPercent', value)}
          />
          <button
            type="button"
            onClick={resetVariables}
            className="text-[10px] tracking-caps uppercase text-gold-light hover:text-primary transition-colors"
          >
            Reset to defaults
          </button>
        </section>

        <section className="border border-white/[0.06] rounded-sm p-6 space-y-4">
          <h2 className="text-[10px] tracking-caps uppercase text-muted">EBITDA waterfall</h2>
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.label}
                className={`flex items-center justify-between gap-4 text-sm font-light ${
                  row.highlight ? 'border-t border-white/[0.06] pt-4 mt-2' : ''
                }`}
              >
                <span className={row.highlight ? 'text-primary' : 'text-secondary'}>{row.label}</span>
                <span
                  className={`tabular-nums ${
                    row.highlight
                      ? 'text-gold-light'
                      : row.value < 0
                        ? 'text-red-400/80'
                        : 'text-primary'
                  }`}
                >
                  {row.value < 0 ? `(${currency.format(Math.abs(row.value))})` : currency.format(row.value)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <HeaderDividerBeam animated={false} />
    </div>
  );
}

export function ProformaPageContent() {
  return (
    <ProformaProvider>
      <ProformaWorkspace />
    </ProformaProvider>
  );
}
