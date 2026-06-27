export interface ResearchArticle {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  category: string;
  body: string[];
}

export const RESEARCH_ARTICLES: ResearchArticle[] = [
  {
    slug: 'understanding-bpc-157-in-vitro-models',
    title: 'Understanding BPC-157 in In-Vitro Models',
    excerpt:
      'An overview of how BPC-157 is studied in connective tissue and gastrointestinal cell culture systems.',
    publishedAt: '2026-03-15',
    category: 'Connective Tissue Research',
    body: [
      'BPC-157 (Body Protection Compound) remains one of the most frequently requested peptides in preclinical connective-tissue model research.',
      'Laboratory teams typically evaluate fibroblast migration, collagen deposition, and inflammatory marker modulation under controlled culture conditions.',
      'TPT Peptides supplies HPLC-verified material with batch traceability suitable for institutional procurement workflows.',
    ],
  },
  {
    slug: 'gh-axis-peptide-screening',
    title: 'GH Axis Peptide Screening Workflows',
    excerpt:
      'How research groups compare secretagogue analogs including CJC-1295 and ipamorelin blends.',
    publishedAt: '2026-04-02',
    category: 'Endocrine Research',
    body: [
      'Growth hormone releasing hormone analogs are studied for receptor binding kinetics and downstream signaling cascades.',
      'Side-by-side variant comparison is critical when designing receptor occupancy assays.',
      'Always document lot numbers and COA references in your lab notebook for audit readiness.',
    ],
  },
  {
    slug: 'metabolic-peptide-assay-design',
    title: 'Designing Metabolic Peptide Assays',
    excerpt:
      'Best practices for MOTS-C and 5-Amino-1MQ cell-based metabolic efficiency studies.',
    publishedAt: '2026-05-20',
    category: 'Metabolic Research',
    body: [
      'Mitochondrial-derived peptides require strict cold-chain handling and validated reconstitution protocols.',
      'Assay design should include appropriate positive controls and replicate structure for publication-quality data.',
      'TPT Peptides cold-chain logistics are optimized for temperature-sensitive research inventory.',
    ],
  },
];

export function getResearchArticle(slug: string): ResearchArticle | undefined {
  return RESEARCH_ARTICLES.find((article) => article.slug === slug);
}
