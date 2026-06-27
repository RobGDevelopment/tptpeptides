import type { MetadataRoute } from 'next';
import catalogData from '../lib/data/catalog.json';
import { getSiteUrl } from '../lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${baseUrl}/lab-results`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/protocols`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/account`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/checkout`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    {
      url: `${baseUrl}/research-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];

  const catalogRoutes: MetadataRoute.Sitemap = catalogData.map((entry) => ({
    url: `${baseUrl}/catalog/${entry.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...catalogRoutes];
}
