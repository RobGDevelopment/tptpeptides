import type { Metadata, Viewport } from 'next';
import { StorefrontFooter } from '../../features/storefront/components/StorefrontFooter';
import { StorefrontShell } from '../../features/storefront/components/StorefrontShell';
import { getActiveTenantId } from '../../lib/tenant/getTenant.server';
import { getTenantConfigForRequest } from '../../lib/tenant/getTenantConfig.server';
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
  themeColor: '#fcfcfc',
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
  const supportEmail = resolveTenantSupportEmail(tenantConfig);
  const termsUrl = resolveTenantTermsUrl(tenantConfig);
  const footerTagline =
    tenantConfig.content?.heroHeadline ??
    'Evidence-based wellness programs delivered by licensed clinicians.';

  return (
    <div className="min-h-screen bg-void text-primary antialiased flex flex-col">
      <StorefrontShell skipAgeGate>{children}</StorefrontShell>
      <StorefrontFooter
        tagline={footerTagline}
        supportEmail={supportEmail}
        termsUrl={termsUrl}
      />
    </div>
  );
}
