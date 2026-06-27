import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0f',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 48,
          fontWeight: 500,
          letterSpacing: '0.15em',
          color: '#d4bc82',
        }}
      >
        TPT
      </div>
    ),
    { ...size }
  );
}
