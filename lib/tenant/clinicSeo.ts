/**
 * B2B/research paths that must never resolve on the clinic lane (tptclinic.com).
 * Shared by proxy.ts, robots.ts, and sitemap.ts.
 */
export const CLINIC_BLOCKED_PUBLIC_PATHS = [
  '/catalog',
  '/research',
  '/research-policy',
  '/lab-results',
  '/protocols',
  '/checkout',
  '/cart',
  '/account',
  '/b2b',
  '/design-system',
  '/invite',
] as const;

export type ClinicBlockedPublicPath = (typeof CLINIC_BLOCKED_PUBLIC_PATHS)[number];

export function isClinicBlockedPublicPath(pathname: string): boolean {
  const normalized = pathname.split('?')[0]?.toLowerCase() ?? '/';
  return CLINIC_BLOCKED_PUBLIC_PATHS.some(
    (blocked) => normalized === blocked || normalized.startsWith(`${blocked}/`)
  );
}

/** Public clinic routes eligible for sitemap indexing. */
export const CLINIC_SITEMAP_ROUTES = [
  { path: '/', changeFrequency: 'daily' as const, priority: 1 },
  { path: '/intake', changeFrequency: 'weekly' as const, priority: 0.9 },
  { path: '/dashboard', changeFrequency: 'weekly' as const, priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.4 },
  { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.4 },
];

export const CLINIC_SEO = {
  title: 'TPT Clinic — Board-Certified Telehealth Consultations',
  description:
    'Physician-led telehealth for medical weight loss and longevity care. Secure HIPAA-compliant patient portal, licensed clinicians, and concierge clinical support.',
  keywords: [
    'telehealth clinic',
    'concierge medicine',
    'medical weight loss',
    'longevity care',
    'HIPAA compliant telehealth',
    'board-certified physicians',
    'secure patient portal',
  ],
} as const;
