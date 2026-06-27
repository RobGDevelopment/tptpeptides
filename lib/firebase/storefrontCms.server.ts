import 'server-only';

import { unstable_cache } from 'next/cache';
import { getAdminFirestore, isAdminSdkConfigured } from './admin';
import {
  categoryMerchandisingSchema,
  homepageMerchandisingSchema,
  protocolTemplateCmsSchema,
  researchArticleCmsSchema,
  siteSettingsSchema,
  type CategoryMerchandising,
  type HomepageMerchandising,
  type ProtocolTemplateCms,
  type ResearchArticleCms,
  type SiteSettings,
} from '../schemas/storefrontCms';
import {
  buildDefaultCategoryMerchandising,
  DEFAULT_HOMEPAGE,
  DEFAULT_PROTOCOLS,
  DEFAULT_RESEARCH_ARTICLES,
  DEFAULT_SITE_SETTINGS,
} from '../data/storefrontCmsDefaults';
import type { CatalogSummary } from '../../features/storefront/types';

const CMS = {
  settings: 'cms/settings',
  homepage: 'cms/homepage',
  categories: 'cms/categories',
  research: 'researchArticles',
  protocols: 'protocols',
} as const;

async function readDoc<T>(
  path: string,
  schema: { parse: (data: unknown) => T },
  fallback: T
): Promise<T> {
  if (!isAdminSdkConfigured()) return fallback;

  try {
    const db = getAdminFirestore();
    const snap = await db.doc(path).get();
    if (!snap.exists) return fallback;
    return schema.parse(snap.data());
  } catch (error) {
    console.error(`[cms] Failed to read ${path}`, error);
    return fallback;
  }
}

async function fetchResearchArticlesCms(): Promise<ResearchArticleCms[]> {
  if (!isAdminSdkConfigured()) return DEFAULT_RESEARCH_ARTICLES;

  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(CMS.research).get();
    if (snapshot.empty) return DEFAULT_RESEARCH_ARTICLES;

    const articles = snapshot.docs
      .map((doc) => researchArticleCmsSchema.safeParse({ slug: doc.id, ...doc.data() }))
      .filter((result) => result.success)
      .map((result) => result.data)
      .filter((article) => article.published)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    return articles.length > 0 ? articles : DEFAULT_RESEARCH_ARTICLES;
  } catch (error) {
    console.error('[cms] research articles fetch failed', error);
    return DEFAULT_RESEARCH_ARTICLES;
  }
}

async function fetchProtocolTemplatesCms(): Promise<ProtocolTemplateCms[]> {
  if (!isAdminSdkConfigured()) return DEFAULT_PROTOCOLS;

  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(CMS.protocols).get();
    if (snapshot.empty) return DEFAULT_PROTOCOLS;

    const protocols = snapshot.docs
      .map((doc) => protocolTemplateCmsSchema.safeParse({ id: doc.id, ...doc.data() }))
      .filter((result) => result.success)
      .map((result) => result.data)
      .filter((protocol) => protocol.published)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return protocols.length > 0 ? protocols : DEFAULT_PROTOCOLS;
  } catch (error) {
    console.error('[cms] protocols fetch failed', error);
    return DEFAULT_PROTOCOLS;
  }
}

const cachedSiteSettings = unstable_cache(
  () => readDoc(CMS.settings, siteSettingsSchema, DEFAULT_SITE_SETTINGS),
  ['cms-site-settings'],
  { revalidate: 3600, tags: ['cms-settings'] }
);

const cachedHomepageMerchandising = unstable_cache(
  () => readDoc(CMS.homepage, homepageMerchandisingSchema, DEFAULT_HOMEPAGE),
  ['cms-homepage'],
  { revalidate: 3600, tags: ['cms-homepage'] }
);

const cachedCategoryMerchandising = unstable_cache(
  () => readDoc(CMS.categories, categoryMerchandisingSchema, buildDefaultCategoryMerchandising()),
  ['cms-categories'],
  { revalidate: 3600, tags: ['cms-categories'] }
);

const cachedResearchArticles = unstable_cache(fetchResearchArticlesCms, ['cms-research-articles'], {
  revalidate: 60,
  tags: ['cms-research'],
});

const cachedProtocolTemplates = unstable_cache(fetchProtocolTemplatesCms, ['cms-protocols'], {
  revalidate: 60,
  tags: ['cms-protocols'],
});

export async function getSiteSettings(): Promise<SiteSettings> {
  return cachedSiteSettings();
}

export async function getHomepageMerchandising(): Promise<HomepageMerchandising> {
  return cachedHomepageMerchandising();
}

export async function getCategoryMerchandising(): Promise<CategoryMerchandising> {
  return cachedCategoryMerchandising();
}

export async function getResearchArticlesCms(): Promise<ResearchArticleCms[]> {
  return cachedResearchArticles();
}

export async function getResearchArticleCms(slug: string): Promise<ResearchArticleCms | null> {
  const articles = await getResearchArticlesCms();
  return articles.find((article) => article.slug === slug) ?? null;
}

/** Admin: includes unpublished — bypasses storefront cache. */
export async function getAllResearchArticlesCms(): Promise<ResearchArticleCms[]> {
  if (!isAdminSdkConfigured()) return DEFAULT_RESEARCH_ARTICLES;

  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(CMS.research).get();
    if (snapshot.empty) return DEFAULT_RESEARCH_ARTICLES;

    return snapshot.docs
      .map((doc) => researchArticleCmsSchema.safeParse({ slug: doc.id, ...doc.data() }))
      .filter((result) => result.success)
      .map((result) => result.data)
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch {
    return DEFAULT_RESEARCH_ARTICLES;
  }
}

export async function getProtocolTemplatesCms(): Promise<ProtocolTemplateCms[]> {
  return cachedProtocolTemplates();
}

/** Admin: includes unpublished — bypasses storefront cache. */
export async function getAllProtocolTemplatesCms(): Promise<ProtocolTemplateCms[]> {
  if (!isAdminSdkConfigured()) return DEFAULT_PROTOCOLS;

  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(CMS.protocols).get();
    if (snapshot.empty) return DEFAULT_PROTOCOLS;

    return snapshot.docs
      .map((doc) => protocolTemplateCmsSchema.safeParse({ id: doc.id, ...doc.data() }))
      .filter((result) => result.success)
      .map((result) => result.data)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return DEFAULT_PROTOCOLS;
  }
}

export function resolveFeaturedProducts(
  catalog: CatalogSummary[],
  merchandising: HomepageMerchandising
): CatalogSummary[] {
  const { featuredSlugs, featuredLimit } = merchandising;

  if (featuredSlugs.length > 0) {
    const bySlug = new Map(catalog.map((product) => [product.slug, product]));
    const ordered = featuredSlugs
      .map((slug) => bySlug.get(slug))
      .filter((product): product is CatalogSummary => product != null);
    return ordered.slice(0, featuredLimit);
  }

  return catalog.slice(0, featuredLimit);
}

export { resolveCategoryDisplayName, sortCatalogCategories } from '../storefront/categoryMerchandising';

export { CMS as CMS_PATHS };
