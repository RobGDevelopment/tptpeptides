import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/admin', '/api/', '/api'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
