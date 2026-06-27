import type { CatalogEntry } from '../schemas/catalog';

const MANUAL_RELATED: Record<string, string[]> = {
  'bpc-157': ['tb-500', 'ghk-cu', 'bpc-157-tb-500'],
  'tb-500': ['bpc-157', 'ghk-cu', 'bpc-157-tb-500'],
  'ghk-cu': ['bpc-157', 'tb-500', 'glow-blend'],
  'cjc-1295-dac': ['cjc-ipamorelin', 'cjc-1295-no-dac', 'ipamorelin'],
  semaglutide: ['cagrilintide', 'tirzepatide'],
  'mots-c': ['5-amino-1mq', 'epithalon'],
};

export function getRelatedCatalogSlugs(entry: CatalogEntry, allEntries: CatalogEntry[], limit = 3): string[] {
  const manual = MANUAL_RELATED[entry.id] ?? [];
  const fromManual = manual.filter((slug) => slug !== entry.id && allEntries.some((e) => e.id === slug));

  if (fromManual.length >= limit) {
    return fromManual.slice(0, limit);
  }

  const sameCategory = allEntries
    .filter((candidate) => candidate.id !== entry.id && candidate.category === entry.category)
    .map((candidate) => candidate.id);

  const byResearch = allEntries
    .filter((candidate) => {
      if (candidate.id === entry.id) return false;
      return candidate.researchAreas.some((area) => entry.researchAreas.includes(area));
    })
    .map((candidate) => candidate.id);

  const combined = [...new Set([...fromManual, ...sameCategory, ...byResearch])];
  return combined.slice(0, limit);
}
