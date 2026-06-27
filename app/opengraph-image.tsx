import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE, SITE_WORDMARK } from '../lib/brand';

export const runtime = 'edge';
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'oklch(0.11 0.008 260)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            width: 120,
            height: 1,
            background: 'linear-gradient(90deg, transparent, oklch(0.72 0.06 85 / 0.5), transparent)',
            marginBottom: 40,
          }}
        />
        <div
          style={{
            fontSize: 56,
            fontWeight: 300,
            letterSpacing: '0.1em',
            background: 'linear-gradient(105deg, oklch(0.62 0.05 85), oklch(0.82 0.07 90), oklch(0.68 0.05 80))',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {SITE_WORDMARK}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 18,
            fontWeight: 300,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'oklch(0.48 0.015 260)',
          }}
        >
          {SITE_TAGLINE}
        </div>
        <div
          style={{
            marginTop: 48,
            width: 200,
            height: 1,
            background: 'linear-gradient(90deg, transparent, oklch(0.72 0.06 85 / 0.35), transparent)',
          }}
        />
        <div
          style={{
            marginTop: 24,
            fontSize: 14,
            color: 'oklch(0.42 0.015 260)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          Research use only · HPLC verified
        </div>
      </div>
    ),
    { ...size }
  );
}
