import type { Metadata, Viewport } from 'next';
import { CONSUMER_APP } from '../../lib/app/profiles';
import { StorefrontFooter } from '../../features/storefront/components/StorefrontFooter';
import { ImpersonationBanner } from '../../features/admin/components/ImpersonationBanner';
import { StorefrontShell } from '../../features/storefront/components/StorefrontShell';
import { ResearchCoPilot } from '../../features/storefront/components/ResearchCoPilot';
import { getSiteSettings } from '../../lib/firebase/storefrontCms.server';
import { getTenantConfig } from '../../lib/firebase/tenant.server';
import { getModuleFlags } from '../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../lib/modules/flags';
import { getActiveTenantId } from '../../lib/tenant/getTenant.server';
import {
  resolveTenantSupportEmail,
  resolveTenantTermsUrl,
} from '../../lib/tenant/content';

export const metadata: Metadata = {
  applicationName: CONSUMER_APP.shortName,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: CONSUMER_APP.shortName,
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: CONSUMER_APP.themeColor,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const flags = await getModuleFlags();
  const copilotEnabled = isModuleEnabled(flags, 'isAiCoPilotEnabled');
  const tenantId = await getActiveTenantId();
  const tenantConfig = await getTenantConfig(tenantId);
  const supportEmail = resolveTenantSupportEmail(tenantConfig);
  const termsUrl = resolveTenantTermsUrl(tenantConfig);

  return (
    <div className="min-h-screen bg-void text-primary antialiased flex flex-col">
      <ImpersonationBanner />
      <StorefrontShell>{children}</StorefrontShell>
      {copilotEnabled ? <ResearchCoPilot /> : null}
      <StorefrontFooter
        tagline={settings.footerTagline}
        supportEmail={supportEmail}
        termsUrl={termsUrl}
      />
    </div>
  );
}
