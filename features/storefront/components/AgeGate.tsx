'use client';

import { useState } from 'react';
import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SITE_WORDMARK } from '../../../lib/brand';

interface AgeGateProps {
  onVerify: () => void;
  isReady?: boolean;
}

export function AgeGate({ onVerify, isReady = true }: AgeGateProps) {
  const [ageConfirmation, setAgeConfirmation] = useState('');

  const canEnter = isReady && ageConfirmation === '21_plus';

  return (
    <div className="fixed inset-0 z-[9999] bg-void/98 backdrop-blur-md flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <PageHeader wordmark={SITE_WORDMARK} subtitle="Age Verification Required" />

        <div className="mt-10 flex justify-center text-gold mb-8">
          <Icons.Shield />
        </div>

        <p className="text-sm text-secondary font-light leading-relaxed mb-8">
          By entering this site, you certify that you are 21 years of age or older. All compounds
          are strictly for in-vitro laboratory research use only and are not for human consumption.
        </p>

        <label className="block text-left mb-8">
          <span className="text-[10px] tracking-caps uppercase text-muted mb-2 block">
            Age confirmation (required)
          </span>
          <select
            value={ageConfirmation}
            onChange={(event) => setAgeConfirmation(event.target.value)}
            disabled={!isReady}
            className="w-full bg-transparent border border-white/[0.12] text-sm text-primary font-light px-4 py-3 focus:outline-none focus:border-gold/40 disabled:opacity-40"
          >
            <option value="">Select your age confirmation</option>
            <option value="21_plus">I confirm I am 21 years of age or older</option>
          </select>
        </label>

        <button
          type="button"
          onClick={onVerify}
          disabled={!canEnter}
          className="terminal-link text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isReady ? 'Enter Terminal' : 'Loading...'}
        </button>

        <HeaderDividerBeam delay={1} className="mt-12" />

        <p className="text-[10px] text-muted mt-6 tracking-caps uppercase">
          Facility access logged & monitored
        </p>
      </div>
    </div>
  );
}
