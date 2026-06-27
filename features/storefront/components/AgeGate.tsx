import { Icons } from '../../../components/icons';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SITE_WORDMARK } from '../../../lib/brand';

interface AgeGateProps {
  onVerify: () => void;
  isReady?: boolean;
}

export function AgeGate({ onVerify, isReady = true }: AgeGateProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-void/98 backdrop-blur-md flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <PageHeader wordmark={SITE_WORDMARK} subtitle="Age Verification Required" />

        <div className="mt-10 flex justify-center text-gold mb-8">
          <Icons.Shield />
        </div>

        <p className="text-sm text-secondary font-light leading-relaxed mb-10">
          By entering this site, you certify that you are 21 years of age or older. All compounds
          are strictly for in-vitro laboratory research use only and are not for human consumption.
        </p>

        <button
          type="button"
          onClick={onVerify}
          disabled={!isReady}
          className="terminal-link text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isReady ? 'I Agree — Enter Terminal' : 'Loading...'}
        </button>

        <HeaderDividerBeam delay={1} className="mt-12" />

        <p className="text-[10px] text-muted mt-6 tracking-caps uppercase">
          Facility access logged & monitored
        </p>
      </div>
    </div>
  );
}
