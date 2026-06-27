import { NextResponse } from 'next/server';
import { OWNER_APP } from '../../../lib/app/profiles';

export const dynamic = 'force-static';

export async function GET() {
  const manifest = {
    id: OWNER_APP.id,
    name: OWNER_APP.name,
    short_name: OWNER_APP.shortName,
    description: OWNER_APP.description,
    start_url: OWNER_APP.startUrl,
    scope: OWNER_APP.scope,
    display: 'standalone',
    orientation: 'any',
    theme_color: OWNER_APP.themeColor,
    background_color: OWNER_APP.backgroundColor,
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/admin/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
