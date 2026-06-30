'use client';

import { useState } from 'react';

export type ClinicDashboardTab = 'overview' | 'messages' | 'labs';

const TABS: { id: ClinicDashboardTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'messages', label: 'Messages' },
  { id: 'labs', label: 'Lab Results' },
];

type ClinicDashboardTabsProps = {
  activeTab: ClinicDashboardTab;
  onChange: (tab: ClinicDashboardTab) => void;
};

export function ClinicDashboardTabs({ activeTab, onChange }: ClinicDashboardTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-2 border-b border-black/[0.08] pb-1"
      role="tablist"
      aria-label="Care dashboard sections"
    >
      {TABS.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`rounded-sm px-4 py-2 text-[10px] tracking-caps uppercase transition-colors ${
              selected
                ? 'bg-gold-light/10 text-gold-light border border-gold-light/30'
                : 'text-muted hover:text-secondary border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function useClinicDashboardTab(initial: ClinicDashboardTab = 'overview') {
  return useState<ClinicDashboardTab>(initial);
}
