import type { Metadata, Viewport } from 'next';
import { CONSUMER_APP } from '../../lib/app/profiles';
import { StorefrontFooter } from '../../features/storefront/components/StorefrontFooter';
import { StorefrontShell } from '../../features/storefront/components/StorefrontShell';
import { getSiteSettings } from '../../lib/firebase/storefrontCms.server';

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
};

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen bg-void text-primary antialiased flex flex-col">
      <StorefrontShell>{children}</StorefrontShell>
      <StorefrontFooter tagline={settings.footerTagline} />
    </div>
  );
}
