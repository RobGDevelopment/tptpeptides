import { useId } from 'react';

interface PeptideVialProps {
  /** Center label — e.g. "2 sizes" or compound name */
  label?: string;
  className?: string;
}

export function PeptideVial({ label, className = '' }: PeptideVialProps) {
  const uid = useId().replace(/:/g, '');
  const goldCap = `gold-cap-${uid}`;
  const darkGlass = `dark-glass-${uid}`;
  const glassGlare = `glass-glare-${uid}`;
  const shadow = `vial-shadow-${uid}`;

  const displayLabel =
    label ??
    '';

  return (
    <svg
      viewBox="0 0 120 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={displayLabel ? `Research vial, ${displayLabel}` : 'Research vial'}
      className={`w-full h-full max-w-[120px] mx-auto ${className}`.trim()}
    >
      <defs>
        <linearGradient id={goldCap} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#AA771C" />
          <stop offset="22%" stopColor="#BF953F" />
          <stop offset="45%" stopColor="#FCF6BA" />
          <stop offset="58%" stopColor="#FBF5B7" />
          <stop offset="78%" stopColor="#B38728" />
          <stop offset="100%" stopColor="#AA771C" />
        </linearGradient>

        <linearGradient id={darkGlass} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0c0a08" />
          <stop offset="18%" stopColor="#1a1510" />
          <stop offset="42%" stopColor="#3d3228" />
          <stop offset="58%" stopColor="#352b22" />
          <stop offset="82%" stopColor="#14100c" />
          <stop offset="100%" stopColor="#080604" />
        </linearGradient>

        <linearGradient id={glassGlare} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <radialGradient id={shadow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Base shadow */}
      <ellipse cx="60" cy="192" rx="34" ry="5.5" fill={`url(#${shadow})`} />

      {/* Main glass body */}
      <rect x="28" y="58" width="64" height="128" rx="10" ry="10" fill={`url(#${darkGlass})`} />
      <rect
        x="28.5"
        y="58.5"
        width="63"
        height="127"
        rx="9.5"
        ry="9.5"
        stroke="#ffffff"
        strokeOpacity="0.06"
        strokeWidth="1"
        fill="none"
      />

      {/* Neck */}
      <path
        d="M44 58 L44 48 C44 44 46 42 50 42 H70 C74 42 76 44 76 48 L76 58"
        fill={`url(#${darkGlass})`}
      />
      <path
        d="M44.5 57.5 L44.5 48.5 C44.5 45.2 46.3 43.5 50 43.5 H70 C73.7 43.5 75.5 45.2 75.5 48.5 L75.5 57.5"
        stroke="#ffffff"
        strokeOpacity="0.05"
        strokeWidth="0.75"
        fill="none"
      />

      {/* Cap */}
      <rect x="36" y="14" width="48" height="30" rx="4" ry="4" fill={`url(#${goldCap})`} />
      <rect
        x="36.5"
        y="14.5"
        width="47"
        height="29"
        rx="3.5"
        ry="3.5"
        stroke="#000000"
        strokeOpacity="0.25"
        strokeWidth="0.75"
        fill="none"
      />
      {/* Cap grip ridges */}
      <line x1="38" y1="22" x2="82" y2="22" stroke="#000000" strokeOpacity="0.18" strokeWidth="0.6" />
      <line x1="38" y1="26" x2="82" y2="26" stroke="#000000" strokeOpacity="0.14" strokeWidth="0.5" />
      <line x1="38" y1="30" x2="82" y2="30" stroke="#000000" strokeOpacity="0.12" strokeWidth="0.5" />
      <line x1="38" y1="34" x2="82" y2="34" stroke="#000000" strokeOpacity="0.1" strokeWidth="0.5" />
      {/* Cap highlight */}
      <rect x="40" y="16" width="28" height="3" rx="1.5" fill="#FCF6BA" fillOpacity="0.35" />

      {/* Label panel */}
      <rect x="32" y="98" width="56" height="52" rx="2" fill="#0a0908" fillOpacity="0.92" />
      <rect
        x="32.5"
        y="98.5"
        width="55"
        height="51"
        rx="1.5"
        stroke="#BF953F"
        strokeOpacity="0.55"
        strokeWidth="0.6"
        fill="none"
      />

      {/* Brand + dynamic label */}
      <text
        x="60"
        y="112"
        textAnchor="middle"
        fill="#BF953F"
        fontSize="5.5"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.28em"
        fontWeight="500"
      >
        TPT PEPTIDES
      </text>
      {displayLabel ? (
        <text
          x="60"
          y="132"
          textAnchor="middle"
          fill="#e8e4dc"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fontWeight="400"
        >
          {displayLabel.length > 14 ? `${displayLabel.slice(0, 13)}…` : displayLabel}
        </text>
      ) : null}

      {/* Glass glare overlay */}
      <path
        d="M32 68 L48 64 L52 170 L36 174 Z"
        fill={`url(#${glassGlare})`}
      />
      <path
        d="M78 72 L88 70 L90 120 L80 122 Z"
        fill="#ffffff"
        fillOpacity="0.04"
      />

      {/* Bottom rim highlight */}
      <ellipse cx="60" cy="184" rx="30" ry="2" fill="#ffffff" fillOpacity="0.04" />
    </svg>
  );
}
