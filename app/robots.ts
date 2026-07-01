import type { MetadataRoute } from 'next';
import { CLINIC_BLOCKED_PUBLIC_PATHS } from '../lib/tenant/clinicSeo';
import { getRequestSiteUrl, getRequestTenantLane } from '../lib/tenant/getRequestSite.server';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getRequestSiteUrl();
  const lane = await getRequestTenantLane();

  if (lane === 'telehealth') {
    const clinicDisallow = [
      '/admin',
      '/admin/',
      '/api',
      '/api/',
      '/b2b',
      '/clinic',
      ...CLINIC_BLOCKED_PUBLIC_PATHS,
    ];

    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: clinicDisallow,
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/admin', '/api/', '/api'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
