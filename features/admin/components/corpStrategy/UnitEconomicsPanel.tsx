'use client';

import { useEffect, useRef, useState } from 'react';
import { CORP_UNIT_ECONOMICS } from '../../../../lib/admin/corpStrategyConfig';
import { cn } from '../../../../lib/utils/cn';
import { CorpStrategyIcon } from './CorpStrategyIcons';

function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      queueMicrotask(() => setValue(target));
      return;
    }

    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration]);

  return active ? value : 0;
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    n
  );

interface UnitEconomicsPanelProps {
  patientVolume: number;
  onVolumeChange: (volume: number) => void;
}

export function UnitEconomicsPanel({ patientVolume, onVolumeChange }: UnitEconomicsPanelProps) {
  const { ref, inView } = useInView(0.25);
  const economics = CORP_UNIT_ECONOMICS;

  const gross = useCountUp(economics.grossRevenue, inView);
  const vendor = useCountUp(economics.vendorCosts, inView);
  const net = useCountUp(economics.netProfit, inView);

  const aggregateGross = economics.grossRevenue * patientVolume;
  const aggregateVendor = economics.vendorCosts * patientVolume;
  const aggregateNet = economics.netProfit * patientVolume;

  return (
    <div
      ref={ref}
      className="max-w-4xl mx-auto corp-strategy-glass corp-strategy-glow-money p-8 rounded-3xl relative z-10 text-center corp-strategy-fade-up mb-12"
    >
      <h2 className="text-3xl font-bold mb-6 text-white flex items-center justify-center gap-3">
        <span className="text-emerald-500">
          <CorpStrategyIcon name="sackDollar" size={28} />
        </span>
        {economics.title}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-[#0b1120] p-5 rounded-xl border border-slate-700">
          <h4 className="text-slate-400 text-sm uppercase tracking-wide font-semibold mb-1">
            {economics.grossLabel}
          </h4>
          <div className="text-3xl font-bold text-white mb-2 tabular-nums">{currency(gross)}</div>
          <p className="text-xs text-slate-500">{economics.grossNote}</p>
        </div>

        <div className="bg-[#0b1120] p-5 rounded-xl border border-slate-700">
          <h4 className="text-slate-400 text-sm uppercase tracking-wide font-semibold mb-1">
            {economics.vendorLabel}
          </h4>
          <div className="text-3xl font-bold text-red-400 mb-2 tabular-nums">-{currency(vendor)}</div>
          <ul className="text-xs text-slate-500 space-y-1">
            {economics.vendorItems.map((item) => (
              <li key={item.label} className="flex justify-between">
                <span>{item.label}</span>
                <span>{currency(item.amount)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/30">
          <h4 className="text-emerald-500 text-sm uppercase tracking-wide font-bold mb-1">
            {economics.netLabel}
          </h4>
          <div className="text-3xl font-bold text-emerald-500 mb-2 tabular-nums">{currency(net)}</div>
          <p className="text-xs text-emerald-500/70">{economics.netNote}</p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-700 flex flex-col md:flex-row justify-around text-sm text-slate-400">
        {economics.partnerFootnotes.map((footnote) => (
          <div key={footnote.entity} className="mb-4 md:mb-0">
            <strong className="text-white">{footnote.entity}</strong> {footnote.note}
          </div>
        ))}
      </div>

      {patientVolume > 1 ? (
        <div className="mt-6 pt-6 border-t border-slate-700/60 text-left">
          <p className="text-[10px] tracking-caps uppercase text-slate-500 mb-3">
            Monthly aggregate ({patientVolume} patients)
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block text-xs">Revenue</span>
              <span className="text-white font-semibold tabular-nums">{currency(aggregateGross)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Vendor</span>
              <span className="text-red-400 font-semibold tabular-nums">-{currency(aggregateVendor)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Net</span>
              <span className="text-emerald-500 font-semibold tabular-nums">{currency(aggregateNet)}</span>
            </div>
          </div>
        </div>
      ) : null}

      <label className="mt-8 block max-w-md mx-auto text-left space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[10px] tracking-caps uppercase text-slate-500">
            Patients per month (stress test)
          </span>
          <span className="text-sm text-white font-light tabular-nums">{patientVolume}</span>
        </div>
        <input
          type="range"
          min={1}
          max={500}
          step={1}
          value={patientVolume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className={cn('w-full accent-emerald-500')}
        />
      </label>
    </div>
  );
}
