import type { CSSProperties } from 'react';

const beamStyle: CSSProperties = {
  width: 'min(72vw, 640px)',
  height: '3px',
  background:
    'linear-gradient(90deg, transparent 0%, rgba(191,149,63,0.2) 15%, rgba(191,149,63,0.75) 50%, rgba(191,149,63,0.2) 85%, transparent 100%)',
  boxShadow: '0 0 14px rgba(191,149,63,0.4), 0 0 4px rgba(252,246,186,0.25)',
};

/** Developer signature — centered top-edge gold beam with a slow breathing pulse. */
export function SignatureBeam() {
  return (
    <div
      className="pointer-events-none fixed top-0 inset-x-0 z-[60] flex justify-center h-[3px] overflow-hidden"
      aria-hidden
    >
      <div className="signature-beam-pulse" style={beamStyle} />
    </div>
  );
}
