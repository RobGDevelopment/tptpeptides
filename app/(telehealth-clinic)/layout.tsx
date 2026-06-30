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

export const metadata: Metadata = {
  applicationName: 'TPT Wellness',
  description: 'Board-certified telehealth weight loss and wellness programs.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TPT Wellness',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#F4F9F7',
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
