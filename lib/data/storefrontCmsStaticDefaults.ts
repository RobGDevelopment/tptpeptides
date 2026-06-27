import type {
  HomepageMerchandising,
  ProtocolTemplateCms,
  ResearchArticleCms,
  SiteSettings,
} from '../schemas/storefrontCms';
import { RESEARCH_ARTICLES } from './researchArticles';
import { SITE_LEGAL_NAME } from '../brand';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  heroTitle: 'Research Inventory',
  heroBody:
    'High-purity compounds for qualified laboratories. Strictly for in-vitro research — not for human or veterinary consumption.',
  primaryCtaLabel: 'Browse Full Catalog',
  primaryCtaHref: '/catalog',
  secondaryCtaLabel: 'View COA Library',
  secondaryCtaHref: '/lab-results',
  footerTagline: 'Institutional Research Architecture · System Secure',
};

export const DEFAULT_HOMEPAGE: HomepageMerchandising = {
  featuredTitle: 'Featured Compounds',
  featuredSubtitle:
    'Explore our most requested research peptides. Every SKU links to full variant details, pricing, and live inventory.',
  featuredSlugs: [],
  featuredLimit: 9,
};

export const DEFAULT_RESEARCH_ARTICLES: ResearchArticleCms[] = RESEARCH_ARTICLES.map((article) => ({
  slug: article.slug,
  title: article.title,
  excerpt: article.excerpt,
  publishedAt: article.publishedAt,
  category: article.category,
  body: article.body,
  published: true,
}));

export const DEFAULT_PROTOCOLS: ProtocolTemplateCms[] = [
  {
    id: 'recovery-stack',
    title: 'Connective Tissue Research Panel',
    compounds: ['BPC-157', 'TB-500', 'GHK-Cu'],
    focus: 'In-vitro models investigating extracellular matrix remodeling and fibroblast activity.',
    href: '/catalog/bpc-157',
    sortOrder: 0,
    published: true,
  },
  {
    id: 'metabolic-research',
    title: 'Metabolic Efficiency Panel',
    compounds: ['5-Amino-1MQ', 'MOTS-C', 'AOD-9604'],
    focus: 'Cell-based assays exploring mitochondrial signaling and adipocyte lipid handling.',
    href: '/catalog/5-amino-1mq',
    sortOrder: 1,
    published: true,
  },
  {
    id: 'gh-axis',
    title: 'GH Axis Modulation',
    compounds: ['CJC-1295 w/ DAC', 'Ipamorelin blends'],
    focus: 'Pituitary cell line studies on pulsatile secretagogue response and receptor kinetics.',
    href: '/catalog/cjc-1295-dac',
    sortOrder: 2,
    published: true,
  },
  {
    id: 'longevity',
    title: 'Senescence & Telomere Assay Framework',
    compounds: ['Epithalon', 'MOTS-C'],
    focus: 'Senescence-associated pathways and telomerase expression in controlled culture systems.',
    href: '/catalog/epithalon',
    sortOrder: 3,
    published: true,
  },
];

export const CMS_FOOTER_LEGAL = `© ${new Date().getFullYear()} ${SITE_LEGAL_NAME} · Research use only`;
