import Link from 'next/link';
import { HeroSection } from './HeroSection';
import { CatalogGrid } from './CatalogGrid';
import { NewsletterSignup } from './NewsletterSignup';
import type { CatalogSummary } from '../types';
import type { HomepageMerchandising, SiteSettings } from '../../../lib/schemas/storefrontCms';

interface StorefrontPageProps {
  catalog: CatalogSummary[];
  featured: CatalogSummary[];
  settings: SiteSettings;
  homepage: HomepageMerchandising;
}

export function StorefrontPage({ catalog, featured, settings, homepage }: StorefrontPageProps) {
  return (
    <main className="min-h-screen bg-void">
      <HeroSection settings={settings} />
      <CatalogGrid
        products={featured}
        title={homepage.featuredTitle}
        subtitle={homepage.featuredSubtitle}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-24 text-center space-y-12">
        <Link href="/catalog" className="terminal-link inline-block">
          View All {catalog.length} Compounds
        </Link>
        <div className="text-left">
          <NewsletterSignup />
        </div>
      </div>
    </main>
  );
}
