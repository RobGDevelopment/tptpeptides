import type { Metadata, Viewport } from 'next';
import { ClinicFooter } from '../../features/storefront/components/ClinicFooter';
import { StorefrontShell } from '../../features/storefront/components/StorefrontShell';
import { getActiveTenantId } from '../../lib/tenant/getTenant.server';
import { getClinicLandingForRequest, getTenantConfigForRequest } from '../../lib/tenant/getTenantConfig.server';
import { clinicLandingToCssProperties } from '../../lib/tenant/clinicTheme';
import {
  resolveTenantSupportEmail,
  resolveTenantTermsUrl,
} from '../../lib/tenant/content';
import { CLINIC_BRAND_NAME, CLINIC_CANONICAL_SITE_URL } from '../../lib/tenant/constants';
import { CLINIC_SEO } from '../../lib/tenant/clinicSeo';

export const metadata: Metadata = {
  metadataBase: new URL(CLINIC_CANONICAL_SITE_URL),
  applicationName: CLINIC_BRAND_NAME,
  title: {
    default: CLINIC_SEO.title,
    template: `%s | ${CLINIC_BRAND_NAME}`,
  },
  description: CLINIC_SEO.description,
  keywords: [...CLINIC_SEO.keywords],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CLINIC_CANONICAL_SITE_URL,
    siteName: CLINIC_BRAND_NAME,
    title: CLINIC_SEO.title,
    description: CLINIC_SEO.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: CLINIC_SEO.title,
    description: CLINIC_SEO.description,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: CLINIC_BRAND_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF9F6',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function TelehealthClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenantId = await getActiveTenantId();
  const tenantConfig = await getTenantConfigForRequest(tenantId);
  const landing = await getClinicLandingForRequest();
  const supportEmail = resolveTenantSupportEmail(tenantConfig);
  const termsUrl = resolveTenantTermsUrl(tenantConfig);
  const clinicStyle = clinicLandingToCssProperties(landing);

  return (
    <div
      className="min-h-screen bg-void text-primary antialiased flex flex-col clinic-lane"
      style={clinicStyle}
    >
      <StorefrontShell skipAgeGate>{children}</StorefrontShell>
      <ClinicFooter
        tagline={landing.footerTagline}
        supportEmail={supportEmail}
        termsUrl={termsUrl}
        brandName={tenantConfig.name}
      />
    </div>
  );
}
