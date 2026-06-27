import { StorefrontFooter } from '../../features/storefront/components/StorefrontFooter';
import { StorefrontShell } from '../../features/storefront/components/StorefrontShell';
import { getSiteSettings } from '../../lib/firebase/storefrontCms.server';

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
