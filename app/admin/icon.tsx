import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function AdminIcon() {
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
          border: '2px solid rgba(201, 169, 98, 0.35)',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '0.25em',
            color: '#d4bc82',
          }}
        >
          TPT
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 10,
            letterSpacing: '0.4em',
            color: '#8a8a94',
          }}
        >
          BACK-OFFICE
        </div>
      </div>
    ),
    { ...size }
  );
}
