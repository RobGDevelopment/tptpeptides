import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SignatureBeam } from '../components/ui/SignatureBeam';
import { AppProviders } from './providers';
import { getSiteUrl } from '../lib/site';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '../lib/brand';
import { getActiveTenantId } from '../lib/tenant/getTenant.server';
import { getTenantConfigForRequest } from '../lib/tenant/getTenantConfig.server';
import { tenantThemeToCssProperties } from '../lib/tenant/theme';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500'],
  variable: '--font-inter',
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'TPT Peptides',
    'research peptides',
    'laboratory supplies',
    'in vitro research',
    'BPC-157',
    'GHK-Cu',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenantId = await getActiveTenantId();
  const tenantConfig = await getTenantConfigForRequest(tenantId);
  const tenantThemeStyle = tenantThemeToCssProperties(tenantConfig);
  const isTelehealth = tenantConfig.lane === 'telehealth';

  return (
    <html lang="en" className={isTelehealth ? '' : 'dark'}>
      <body
        className={`${inter.variable} ${inter.className} min-h-screen`}
        style={tenantThemeStyle}
        data-tenant-id={tenantId}
        data-tenant-lane={tenantConfig.lane}
      >
        <SignatureBeam />
        <AppProviders tenantId={tenantId} tenantConfig={tenantConfig}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
