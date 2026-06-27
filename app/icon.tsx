import { ImageResponse } from 'next/og';
import { SITE_WORDMARK } from '../lib/brand';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
          background: '#0d0d0f',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: '0.2em',
            color: '#d4bc82',
          }}
        >
          TPT
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            letterSpacing: '0.35em',
            color: '#7a7a85',
          }}
        >
          {SITE_WORDMARK.split(' ')[1]}
        </div>
      </div>
    ),
    { ...size }
  );
}
