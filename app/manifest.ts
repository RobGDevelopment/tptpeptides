import type { MetadataRoute } from 'next';
import { CONSUMER_APP } from '../lib/app/profiles';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: CONSUMER_APP.id,
    name: CONSUMER_APP.name,
    short_name: CONSUMER_APP.shortName,
    description: CONSUMER_APP.description,
    start_url: CONSUMER_APP.startUrl,
    scope: CONSUMER_APP.scope,
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: CONSUMER_APP.themeColor,
    background_color: CONSUMER_APP.backgroundColor,
    categories: ['shopping', 'medical'],
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
