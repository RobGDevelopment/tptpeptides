import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalogSummaries } from '../../../../../lib/firebase/products.server';
import { getCatalogCategories } from '../../../../../lib/catalog';
import { SITE_NAME } from '../../../../../lib/brand';
import { categoryFromSlug } from '../../../../../lib/utils/slug';
import { CatalogGrid } from '../../../../../features/storefront/components/CatalogGrid';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getCatalogCategories().map((category) => ({
    slug: category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryFromSlug(slug, getCatalogCategories());
  if (!category) return {};
  return {
    title: `${category} Peptides`,
    description: `Browse ${SITE_NAME} ${category} research compounds for in-vitro laboratory use.`,
  };
}

export default async function CategoryCatalogPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categories = getCatalogCategories();
  const category = categoryFromSlug(slug, categories);
  if (!category) notFound();

  const catalog = await getCatalogSummaries();
  const products = catalog.filter((product) => product.category === category);

  return (
    <main className="min-h-screen bg-void selection:bg-gold/20 pt-28">
      <CatalogGrid
        products={products}
        showFilters={false}
        title={category}
        subtitle={`${products.length} research compound${products.length === 1 ? '' : 's'} in this category.`}
      />
    </main>
  );
}
