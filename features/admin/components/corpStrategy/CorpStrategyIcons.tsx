import type { CorpIconKey } from '../../../../lib/admin/corpStrategyConfig';

const iconProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function CorpStrategyIcon({ name, size = 24 }: { name: CorpIconKey; size?: number }) {
  switch (name) {
    case 'laptop':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M2 20h20" />
        </svg>
      );
    case 'doctor':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'flask':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <path d="M10 2v7.31" />
          <path d="M14 9.3V1.99" />
          <path d="M8.5 2h7" />
          <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
          <path d="M5.52 16h12.96" />
        </svg>
      );
    case 'bottle':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <path d="M10 2h4" />
          <path d="M12 2v4" />
          <path d="M8 6h8l-1 14H9L8 6z" />
        </svg>
      );
    case 'desktop':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'boxes':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case 'truck':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
          <circle cx="17" cy="18" r="2" />
          <circle cx="7" cy="18" r="2" />
        </svg>
      );
    case 'trendUp':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'sackDollar':
      return (
        <svg {...iconProps} width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    default:
      return null;
  }
}
