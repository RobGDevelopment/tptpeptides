import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCatalogDetail, getCatalogSummaries } from '../../../../lib/firebase/products.server';
import { SITE_NAME } from '../../../../lib/brand';
import { getSiteUrl } from '../../../../lib/site';
import { CatalogProductDetail } from '../../../../features/storefront/components/CatalogProductDetail';
import { getCatalogEntries } from '../../../../lib/catalog';
import { getRelatedCatalogSlugs } from '../../../../lib/catalog/related';

interface CatalogPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getCatalogEntries().map((entry) => ({ slug: entry.id }));
}

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCatalogDetail(slug);
  if (!detail) return {};

  return {
    title: detail.entry.name,
    description: detail.entry.description,
    openGraph: {
      title: `${detail.entry.name} | ${SITE_NAME} Research Catalog`,
      description: detail.entry.description,
      url: `${getSiteUrl()}/catalog/${detail.entry.slug}`,
    },
  };
}

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { slug } = await params;
  const detail = await getCatalogDetail(slug);
  if (!detail) notFound();

  const entries = getCatalogEntries();
  const entry = entries.find((item) => item.id === slug)!;
  const relatedSlugs = getRelatedCatalogSlugs(entry, entries);
  const allSummaries = await getCatalogSummaries();
  const relatedProducts = allSummaries.filter((product) => relatedSlugs.includes(product.slug));

  const lowestPrice = detail.variants.reduce(
    (min, variant) => Math.min(min, variant.price),
    Number.MAX_SAFE_INTEGER
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: detail.entry.name,
    description: detail.entry.description,
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: detail.entry.category,
    offers: detail.variants.map((variant) => ({
      '@type': 'Offer',
      sku: variant.id,
      price: variant.price,
      priceCurrency: 'USD',
      availability:
        variant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${getSiteUrl()}/catalog/${detail.entry.slug}`,
    })),
    aggregateOffer:
      detail.variants.length > 1
        ? {
            '@type': 'AggregateOffer',
            lowPrice: lowestPrice === Number.MAX_SAFE_INTEGER ? undefined : lowestPrice,
            priceCurrency: 'USD',
            offerCount: detail.variants.length,
          }
        : undefined,
  };

  return (
    <main className="min-h-screen bg-void selection:bg-gold/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CatalogProductDetail detail={detail} relatedProducts={relatedProducts} />
    </main>
  );
}
